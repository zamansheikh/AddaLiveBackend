import { ClientSession, Types } from "mongoose";
import { RepositoryProviders } from "../../core/providers/repository_providers";
import { IUserSvipRepository } from "../../repository/svip/user_svip_repository";
import { SvipConfigService } from "../admin/svip_config_service";
import { IUserSvipDocument } from "../../models/svip/user_svip_model";
import { IMyBucketRepository } from "../../repository/store/my_bucket_repository";
import { IStoreCategoryRepository } from "../../repository/store/store_category_repository";
import { IStoreItemRepository } from "../../repository/store/store_item_repository";

/**
 * Service that handles SVIP tier upgrades when users recharge coins
 * and manages month-end retention/downgrade logic.
 *
 * All methods are static so they can be called from `creditRegularUserCoins`
 * and the cron job without needing to inject a service instance.
 */
export class SvipService {
  private static get userSvipRepo(): IUserSvipRepository {
    return RepositoryProviders.userSvipRepositoryProvider;
  }

  private static get bucketRepo(): IMyBucketRepository {
    return RepositoryProviders.myBucketRepositoryProvider;
  }

  private static get categoryRepo(): IStoreCategoryRepository {
    return RepositoryProviders.storeCategoryRepositoryProvider;
  }

  private static get storeItemRepo(): IStoreItemRepository {
    return RepositoryProviders.storeItemRepositoryProvider;
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Track a recharge event — called from creditRegularUserCoins()
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Called after a user receives coins. Tracks the recharge toward SVIP
   * milestones and upgrades the user's tier if a milestone is crossed.
   *
   * Must be called **inside the same transaction** as the coin transfer.
   *
   * Uses `$inc` for `monthlyRechargeCoins` so concurrent recharges never
   * overwrite each other.
   *
   * @returns The updated (or newly created) user SVIP document.
   */
  static async trackRecharge(
    userId: string,
    coins: number,
    session: ClientSession,
  ): Promise<IUserSvipDocument> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // ── 1. Handle month boundary — reset counter if needed ────────────
    const existing = await SvipService.userSvipRepo.findByUserId(
      userId,
      session,
    );

    let tierAtStartOfMonth = existing?.tierStartOfMonth ?? 0;
    let currentTier = existing?.currentTier ?? 0;

    if (existing && (existing.month !== currentMonth || existing.year !== currentYear)) {
      // New month: start fresh, keep the tier as start-of-month
      tierAtStartOfMonth = existing.currentTier;
      // Reset counter to 0 so the $inc below starts from zero
      await SvipService.userSvipRepo.upsert(
        userId,
        {
          monthlyRechargeCoins: 0,
          tierStartOfMonth: tierAtStartOfMonth,
          month: currentMonth,
          year: currentYear,
        },
        session,
      );
    }

    // ── 2. Atomically add coins ───────────────────────────────────────
    // $inc guarantees no lost updates even under concurrent recharges.
    // $setOnInsert handles first-time creation (upsert: true).
    const svipRecord = await SvipService.userSvipRepo.incMonthlyRecharge(
      userId,
      coins,
      currentTier,
      tierAtStartOfMonth,
      currentMonth,
      currentYear,
      session,
    );

    // ── 3. Check milestones — did we cross any? ───────────────────────
    const config = await SvipConfigService.getConfig();
    if (config && config.tiers.length > 0) {
      const sortedTiers = [...config.tiers].sort(
        (a, b) => a.milestoneCoins - b.milestoneCoins,
      );

      let highestQualifiedTier = svipRecord.currentTier;
      for (const tier of sortedTiers) {
        if (svipRecord.monthlyRechargeCoins >= tier.milestoneCoins) {
          if (tier.tier > highestQualifiedTier) {
            highestQualifiedTier = tier.tier;
          }
        }
      }

      // ── 4. Upgrade tier if a milestone was crossed ──────────────────
      if (highestQualifiedTier > svipRecord.currentTier) {
        await SvipService.userSvipRepo.setTier(
          userId,
          highestQualifiedTier,
          session,
        );
        (svipRecord as any).currentTier = highestQualifiedTier;

        // ── 5. Auto-grant the corresponding SVIP store item to bucket ──
        await SvipService.syncBucketWithTier(
          userId,
          highestQualifiedTier,
          session,
        );
      }
    }
    // If no config, milestones can't be checked — the counter was still
    // incremented above, so no progress is lost when config comes back.

    return svipRecord;
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Bucket sync helper — called from trackRecharge and runMonthlyRetention
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Creates or updates the user's SVIP bucket item to match their current tier.
   *
   * - If the tier's storeItemId is null → logs a warning (item not linked yet).
   * - If the user already has an SVIP bucket → replaces the itemId.
   * - If not → creates a new bucket entry with useStatus: true.
   * - If tier is 0 → removes the SVIP bucket item entirely.
   *
   * This runs **inside the same transaction** as the recharge.
   */
  private static async syncBucketWithTier(
    userId: string,
    tier: number,
    session?: ClientSession,
  ): Promise<void> {
    if (tier < 1) {
      // Downgraded to 0 — remove SVIP bucket item
      const svipCategory = await SvipService.categoryRepo.getCategoryByTitle("SVIP");
      if (svipCategory) {
        const existing = await SvipService.bucketRepo.findBucketByOwnerAndCategory(
          userId,
          (svipCategory as any)._id.toString(),
          session,
        );
        if (existing) {
          await SvipService.bucketRepo.deleteBucket((existing as any)._id.toString());
        }
      }
      return;
    }

    const config = await SvipConfigService.getConfig();
    if (!config) return;

    const tierConfig = config.tiers.find((t) => t.tier === tier);
    if (!tierConfig || !tierConfig.storeItemId) {
      console.warn(
        `[SVIP] No storeItemId linked for tier ${tier} — cannot grant bucket item. ` +
          `Admin must create an SVIP-${tier} store item.`,
      );
      return;
    }

    const svipCategory = await SvipService.categoryRepo.getCategoryByTitle("SVIP");
    if (!svipCategory) {
      console.warn("[SVIP] SVIP category not found — cannot grant bucket item.");
      return;
    }

    const svipCategoryId = (svipCategory as any)._id.toString();

    // Check if user already has an SVIP bucket
    const existingBucket = await SvipService.bucketRepo.findBucketByOwnerAndCategory(
      userId,
      svipCategoryId,
      session,
    );

    if (existingBucket) {
      // Replace existing bucket item
      await SvipService.bucketRepo.updateBucket(
        (existingBucket as any)._id.toString(),
        {
          itemId: tierConfig.storeItemId.toString(),
          useStatus: true,
        },
        session,
      );
    } else {
      // Create new bucket entry with useStatus: true
      // expireAt is a far-future date — no TTL needed, lifecycle managed by cron
      await SvipService.bucketRepo.createNewBucket(
        {
          itemId: tierConfig.storeItemId as any,
          ownerId: userId,
          categoryId: svipCategoryId,
          useStatus: true,
          expireAt: new Date(2100, 0, 1),
        },
        session,
      );
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Month-end retention / downgrade (called from cron)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Runs at the end of each month. For every user with SVIP tier > 0:
   *   1. Determines the effective tier = max(tierStartOfMonth, currentTier)
   *   2. Checks if monthlyRechargeCoins >= retentionThreshold × milestone
   *   3. If yes → retains current tier
   *   4. If no  → downgrades by 1 (never below 0)
   *   5. Resets monthlyRechargeCoins to 0 for the new month
   */
  static async runMonthlyRetention(): Promise<{
    processed: number;
    retained: number;
    downgraded: number;
  }> {
    const config = await SvipConfigService.getConfig();
    if (!config || config.tiers.length === 0) {
      console.log("[SVIP Cron] No config loaded — skipping retention.");
      return { processed: 0, retained: 0, downgraded: 0 };
    }

    const activeUsers = await SvipService.userSvipRepo.findAllActiveSvipUsers();
    const updates: {
      userId: string;
      currentTier: number;
      tierStartOfMonth: number;
    }[] = [];

    let retained = 0;
    let downgraded = 0;

    for (const record of activeUsers) {
      // Effective tier = max(tier they started the month with, highest they earned during the month)
      const effectiveTier = Math.max(
        record.tierStartOfMonth,
        record.currentTier,
      );

      // Find the milestone for this effective tier
      const tierConfig = config.tiers.find((t) => t.tier === effectiveTier);
      if (!tierConfig) {
        // Unknown tier — treat as tier 0
        updates.push({
          userId: record.userId.toString(),
          currentTier: 0,
          tierStartOfMonth: 0,
        });
        downgraded++;
        continue;
      }

      // Check retention: monthly recharge >= retentionThreshold × milestone
      const requiredCoins = Math.floor(
        tierConfig.milestoneCoins * config.retentionThreshold,
      );

      if (record.monthlyRechargeCoins >= requiredCoins) {
        // Retained — keep the same tier
        updates.push({
          userId: record.userId.toString(),
          currentTier: effectiveTier,
          tierStartOfMonth: effectiveTier,
        });
        retained++;
      } else {
        // Failed retention — downgrade by 1 (never below 0)
        const newTier = Math.max(0, effectiveTier - 1);
        updates.push({
          userId: record.userId.toString(),
          currentTier: newTier,
          tierStartOfMonth: newTier,
        });
        downgraded++;
      }
    }

    // Persist all updates in a single bulkWrite
    if (updates.length > 0) {
      await SvipService.userSvipRepo.bulkResetForNewMonth(updates);
    }

    // ── Sync bucket items to match new tiers ───────────────────────────
    // Run outside the bulkWrite — bucket operations are on a different collection.
    // Each operation targets a different user's document, so parallel is safe.
    await Promise.all(
      updates.map((u) => SvipService.syncBucketWithTier(u.userId, u.currentTier)),
    );

    console.log(
      `[SVIP Cron] Retention complete: ${retained} retained, ${downgraded} downgraded, ${activeUsers.length} processed.`,
    );

    return { processed: activeUsers.length, retained, downgraded };
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Get user SVIP status (for API)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Returns a user's SVIP dashboard: current tier, progress toward next
   * milestone, retention status, etc.
   */
  static async getUserStatus(userId: string): Promise<{
    currentTier: number;
    monthlyRechargeCoins: number;
    tierStartOfMonth: number;
    nextMilestone: { tier: number; milestoneCoins: number } | null;
    // Every configured tier's coin requirement, so the client can show the
    // target for whichever tier the user is browsing (not just the next one).
    tiers: { tier: number; milestoneCoins: number }[];
    progressPercent: number;
    retentionStatus: {
      requiredCoins: number;
      currentProgress: number;
      meetsRequirement: boolean;
    } | null;
    currentItem: {
      name: string | null;
      logo: string | null;
      svgaFile: string | null;
      previewFile: string | null;
    };
  }> {
    const config = await SvipConfigService.getConfig();
    const record = await SvipService.userSvipRepo.findByUserId(userId);

    const currentTier = record?.currentTier ?? 0;
    const monthlyRechargeCoins = record?.monthlyRechargeCoins ?? 0;
    const tierStartOfMonth = record?.tierStartOfMonth ?? 0;

    // Find next milestone
    const sortedTiers = config
      ? [...config.tiers].sort((a, b) => a.milestoneCoins - b.milestoneCoins)
      : [];

    const nextMilestone =
      sortedTiers.find((t) => t.tier > currentTier) ?? null;

    const progressPercent = nextMilestone
      ? Math.min(100, Math.floor((monthlyRechargeCoins / nextMilestone.milestoneCoins) * 100))
      : 100;

    // Retention status (for users with SVIP)
    let retentionStatus = null;
    if (currentTier > 0 && config) {
      const effectiveTier = Math.max(tierStartOfMonth, currentTier);
      const tierConfig = sortedTiers.find((t) => t.tier === effectiveTier);
      if (tierConfig) {
        const requiredCoins = Math.floor(
          tierConfig.milestoneCoins * config.retentionThreshold,
        );
        retentionStatus = {
          requiredCoins,
          currentProgress: monthlyRechargeCoins,
          meetsRequirement: monthlyRechargeCoins >= requiredCoins,
        };
      }
    }

    // Current SVIP store item details
    let currentItem: {
      name: string | null;
      logo: string | null;
      svgaFile: string | null;
      previewFile: string | null;
    } = { name: null, logo: null, svgaFile: null, previewFile: null };

    if (currentTier > 0 && config) {
      const tierConfig = sortedTiers.find((t) => t.tier === currentTier);
      if (tierConfig && tierConfig.storeItemId) {
        const storeItem = await SvipService.storeItemRepo.getStoreItemById(
          tierConfig.storeItemId.toString(),
        );
        if (storeItem) {
          // Find the "svga_tag" bundle entry for svgaFile/previewFile
          const tagBundle = storeItem.bundleFiles?.find(
            (b) => b.categoryName === "svga_tag",
          );
          currentItem = {
            name: storeItem.name,
            logo: storeItem.logo ?? null,
            svgaFile: tagBundle?.svgaFile ?? null,
            previewFile: tagBundle?.previewFile ?? null,
          };
        }
      }
    }

    return {
      currentTier,
      monthlyRechargeCoins,
      tierStartOfMonth,
      nextMilestone,
      tiers: sortedTiers.map((t) => ({
        tier: t.tier,
        milestoneCoins: t.milestoneCoins,
      })),
      progressPercent,
      retentionStatus,
      currentItem,
    };
  }
}
