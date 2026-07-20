import { ISvipConfig } from "../../models/admin/svip_config_model";
import { ISvipConfigRepository } from "../../repository/admin/svip_config_repository";
import { RepositoryProviders } from "../../core/providers/repository_providers";

/**
 * Default SVIP tier milestones used to seed the database on first deploy.
 * These are managed by the admin via the config endpoint at runtime.
 */
const DEFAULT_SVIP_CONFIG: ISvipConfig = {
  tiers: [
    { tier: 1, milestoneCoins: 1_000_000, validityMonths: 1, storeItemId: null },
    { tier: 2, milestoneCoins: 4_000_000, validityMonths: 1, storeItemId: null },
    { tier: 3, milestoneCoins: 8_000_000, validityMonths: 1, storeItemId: null },
    { tier: 4, milestoneCoins: 15_000_000, validityMonths: 1, storeItemId: null },
    { tier: 5, milestoneCoins: 25_000_000, validityMonths: 1, storeItemId: null },
    { tier: 6, milestoneCoins: 40_000_000, validityMonths: 1, storeItemId: null },
    { tier: 7, milestoneCoins: 60_000_000, validityMonths: 1, storeItemId: null },
    { tier: 8, milestoneCoins: 85_000_000, validityMonths: 1, storeItemId: null },
    { tier: 9, milestoneCoins: 110_000_000, validityMonths: 1, storeItemId: null },
  ],
  retentionThreshold: 0.5,
};

/**
 * Service for managing SVIP Configuration.
 *
 * Follows the same caching pattern as XpConfigService:
 * static in-memory cache + lazy-load from DB + eager bootstrap on startup.
 */
export class SvipConfigService {
  private static configCache: ISvipConfig | null = null;
  private static configLoaded = false;
  private static loadingPromise: Promise<ISvipConfig | null> | null = null;

  private static get repository(): ISvipConfigRepository {
    return RepositoryProviders.svipConfigRepositoryProvider;
  }

  /** Seeds defaults on first deploy and warms the cache on startup. */
  static async bootstrap(): Promise<void> {
    const dbConfig = await SvipConfigService.repository.getConfig();
    if (!dbConfig) {
      await SvipConfigService.updateConfig(DEFAULT_SVIP_CONFIG);
      console.log("🌱 SVIP Configuration seeded in database from defaults.");
    }
    await SvipConfigService.getConfig();
    console.log("✅ SVIP Configuration cache warmed.");
  }

  /** Returns the SVIP config from the in-memory cache (lazy-loaded). */
  static async getConfig(): Promise<ISvipConfig | null> {
    if (SvipConfigService.configLoaded) {
      return SvipConfigService.configCache;
    }

    if (!SvipConfigService.loadingPromise) {
      SvipConfigService.loadingPromise = (async () => {
        try {
          const dbConfig = await SvipConfigService.repository.getConfig();

          SvipConfigService.configLoaded = true;
          if (dbConfig) {
            SvipConfigService.configCache = {
              tiers: dbConfig.tiers,
              retentionThreshold: dbConfig.retentionThreshold,
            };
          }

          return SvipConfigService.configCache;
        } finally {
          SvipConfigService.loadingPromise = null;
        }
      })();
    }

    return SvipConfigService.loadingPromise;
  }

  /** Updates the config in DB and immediately refreshes the cache. */
  static async updateConfig(data: Partial<ISvipConfig>): Promise<ISvipConfig> {
    const updated = await SvipConfigService.repository.updateConfig(data);
    const result: ISvipConfig = {
      tiers: updated.tiers,
      retentionThreshold: updated.retentionThreshold,
    };
    SvipConfigService.configCache = result;
    SvipConfigService.configLoaded = true;
    return result;
  }
}
