import MyBucketModel from "../../models/store/my_bucket_model";
import StoreCategoryModel from "../../models/store/store_category_model";
import { IStoreItem } from "../../models/store/store_item_model";
import User from "../../models/user/user_model";
import MyBucketRepository from "../../repository/store/my_bucket_repository";
import StoreCategoryRepository from "../../repository/store/store_category_repository";
import UserRepository from "../../repository/users/user_repository";
import SingletonSocketServer from "../sockets/singleton_socket_server";
import { AudioRoomChannels } from "../Utils/enums";
import { XpConfigService } from "../../services/admin/xp_config_service";
import MedalModel from "../../models/medal/medal_model";
import MedalRepository from "../../repository/medal/medal_repository";
import UserSvipModel from "../../models/svip/user_svip_model";

export class XpHelper {
  private static instance: XpHelper;

  //   repositories
  public userRepository = new UserRepository(User);
  public bucketRepository = new MyBucketRepository(MyBucketModel);
  public storeCategoryRepository = new StoreCategoryRepository(
    StoreCategoryModel,
  );
  public medalRepository = new MedalRepository(MedalModel);

  private constructor() {}

  public static getInstance(): XpHelper {
    if (!XpHelper.instance) {
      XpHelper.instance = new XpHelper();
    }
    return XpHelper.instance;
  }

  public async updateUserXp(userId: string, xpAmount: number) {
    const config = await XpConfigService.getConfig();
    if (!config) {
      console.warn(`[XpHelper] updateUserXp skipped for user ${userId}: XP config not loaded`);
      return;
    }

    // Atomically increment XP to prevent race conditions
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { totalEarnedXp: xpAmount } },
      { new: true },
    );
    if (!user) return;

    const level = this.determineUserLevelFromXp(
      user.totalEarnedXp,
      config.xpLevels,
    );
    const oldLevel = user.level || 0;

    if (level > oldLevel) {
      const socketInstance = SingletonSocketServer.getInstance();
      socketInstance.emitToUser(userId, AudioRoomChannels.LevelUp, { level });

      // Auto-award medals using atomic $ne + $push to prevent duplicates
      for (let lvl = oldLevel + 1; lvl <= level; lvl++) {
        await this.awardMedalForLevel(userId, lvl);
      }
    }

    // Atomically set the level, but only if it's higher than the current DB value
    // This prevents a concurrent slower request from downgrading a higher level
    await User.updateOne(
      { _id: userId, level: { $lt: level } },
      { $set: { level } },
    );
  }

  public async updateUserXpFromCoin(userId: string, coins: number) {
    const config = await XpConfigService.getConfig();
    if (!config) {
      console.warn(`[XpHelper] updateUserXpFromCoin skipped for user ${userId}: XP config not loaded`);
      return;
    }

    const xpAmount =
      (coins / config.giftSendXp) *
      (await this.calculateSvipMultiplier(userId, config.svipMultipliers));

    // Atomically increment XP to prevent race conditions
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { totalEarnedXp: xpAmount } },
      { new: true },
    );
    if (!user) return;

    const level = this.determineUserLevelFromXp(
      user.totalEarnedXp,
      config.xpLevels,
    );
    const oldLevel = user.level || 0;

    if (level > oldLevel) {
      const socketInstance = SingletonSocketServer.getInstance();
      socketInstance.emitToUser(userId, AudioRoomChannels.LevelUp, { level });

      // Auto-award medals using atomic $ne + $push to prevent duplicates
      for (let lvl = oldLevel + 1; lvl <= level; lvl++) {
        await this.awardMedalForLevel(userId, lvl);
      }
    }

    // Atomically set the level, but only if it's higher than the current DB value
    await User.updateOne(
      { _id: userId, level: { $lt: level } },
      { $set: { level } },
    );
  }

  private async calculateSvipMultiplier(
    userId: string,
    svipMultipliers: { minLevel: number; multiplier: number }[],
  ): Promise<number> {
    const highestSvip = await this.getHighestSvipLevel(userId);
    const sorted = [...svipMultipliers].sort(
      (a, b) => b.minLevel - a.minLevel,
    );
    for (const tier of sorted) {
      if (highestSvip >= tier.minLevel) return tier.multiplier;
    }
    return 1.0;
  }

  public async getHighestSvipLevel(userId: string): Promise<number> {
    // ── 1. Check store-bucket SVIP items (legacy purchase-based) ─────────
    const svipPackages = (
      await this.bucketRepository.getAllPremiumItems(userId)
    )
      .filter((item) => item.itemId)
      .map((item) => (item.itemId as IStoreItem).name)
      .filter((name) => name.includes("SVIP"))
      .map((name) => parseInt(name.split("SVIP-")?.[1] || "0") || 0);

    let highestSvip =
      svipPackages.length === 0 ? 0 : Math.max(...svipPackages);

    // ── 2. Also check milestone-based SVIP tier (new system) ────────────
    try {
      const svipRecord = await UserSvipModel.findOne({ userId }).lean();
      if (svipRecord && svipRecord.currentTier > highestSvip) {
        highestSvip = svipRecord.currentTier;
      }
    } catch (error) {
      // Non-critical — fall back to store-bucket result
      console.warn(
        `[XpHelper] Failed to read SVIP record for user ${userId}:`,
        error,
      );
    }

    return highestSvip;
  }

  private determineUserLevelFromXp(
    xpCount: number,
    xpLevels: number[],
  ): number {
    for (let i = 0; i < xpLevels.length; i++) {
      if (xpCount < xpLevels[i]) {
        return i; // Levels start from 0
      }
    }
    return xpLevels.length; // at maximum level
  }

  private async awardMedalForLevel(userId: string, level: number): Promise<void> {
    try {
      const medal = await this.medalRepository.findByLevel(level);
      if (!medal) return;

      // Atomic $ne + $push — prevents duplicates even under concurrent requests
      const result = await User.updateOne(
        { _id: userId, "earnedMedals.medalId": { $ne: medal._id } },
        {
          $push: {
            earnedMedals: {
              medalId: medal._id,
              earnedAt: new Date(),
            },
          },
        },
      );

      if (result.modifiedCount > 0) {
        console.log(
          `[XpHelper] Awarded medal "${medal.name}" to user ${userId} for reaching level ${level}`,
        );
      }
    } catch (error: any) {
      console.error(
        `[XpHelper] Failed to award medal for level ${level}: ${error.message}`,
      );
    }
  }
}
