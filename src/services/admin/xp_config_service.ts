import { IXpConfig } from "../../models/admin/xp_config_model";
import { IXpConfigRepository } from "../../repository/admin/xp_config_repository";
import { RepositoryProviders } from "../../core/providers/repository_providers";

/**
 * Default XP configuration used to seed the database on first deploy.
 * Defined here — NOT imported from constants.ts — so the admin DB document
 * is always the single source of truth for XP calculations.
 */
const DEFAULT_XP_CONFIG: IXpConfig = {
  xpLevels: [
    160, 325, 460, 625, 805, 995, 1175, 1382, 1618, 1937,
    2332, 2892, 3602, 4442, 5427, 6630, 8010, 9517, 11215, 13022,
    15009, 17269, 19567, 22254, 25207, 28410, 31810, 35427, 39228, 43278,
    47614, 52126, 56982, 62180, 67928, 73928, 80356, 87202, 97002, 107203,
    123767, 145890, 174319, 210897, 254555, 304540, 363509, 431094, 500617, 580602,
    670860, 772069,
  ],
  giftSendXp: 600,
  svipMultipliers: [
    { minLevel: 0, multiplier: 1.0 },
    { minLevel: 2, multiplier: 1.2 },
    { minLevel: 7, multiplier: 1.3 },
    { minLevel: 9, multiplier: 1.4 },
  ],
};

/**
 * Service for managing XP Configuration.
 *
 * Caching strategy:
 *   - Uses a static in-memory cache (`configCache`) that is lazily loaded
 *     from the database on first access.
 *   - Bootstrap eagerly warms the cache on server startup.
 *   - Admin updates immediately refresh the cache.
 *   - Result: near-zero read time on every gift send, zero network I/O.
 *
 * All methods are static. No instance is ever created — XpHelper and the
 * controller both call XpConfigService.getConfig() / updateConfig() directly.
 */
export class XpConfigService {
  /** In-memory cache — null until first load or after restart. */
  private static configCache: IXpConfig | null = null;

  /** True once a DB fetch has completed (whether or not a document existed). */
  private static configLoaded = false;

  /**
   * Shared promise for in-flight DB reads — prevents race conditions and
   * deduplicates concurrent getConfig() calls.
   */
  private static loadingPromise: Promise<IXpConfig | null> | null = null;

  /** Lazily-resolved repository reference. */
  private static get repository(): IXpConfigRepository {
    return RepositoryProviders.xpConfigRepositoryProvider;
  }

  /**
   * Bootstraps the XP configuration from the database.
   * Seeds defaults on first deploy; warms the in-memory cache on every startup.
   * Should be called once during server startup after DB connection.
   */
  static async bootstrap(): Promise<void> {
    const dbConfig = await XpConfigService.repository.getConfig();
    if (!dbConfig) {
      // First deploy — seed defaults into DB via the service layer
      // (updateConfig sets configCache + configLoaded, preventing race
      // conditions with concurrent getConfig() calls during startup).
      await XpConfigService.updateConfig(DEFAULT_XP_CONFIG);
      console.log("🌱 XP Configuration seeded in database from defaults.");
    }

    // Warm the in-memory cache so the first gift send never hits the DB
    await XpConfigService.getConfig();
    console.log("✅ XP Configuration cache warmed.");
  }

  /**
   * Returns the XP configuration from the in-memory cache.
   *
   * - First call: lazy-loads from the database using a shared promise.
   * - Subsequent calls: returns the cached value immediately (zero I/O).
   * - If the DB document is missing: configLoaded is set to true and null
   *   is returned without re-hitting the DB on every call.
   * - Safe against race conditions with updateConfig() via the
   *   configLoaded guard inside the loadingPromise.
   */
  static async getConfig(): Promise<IXpConfig | null> {
    // Fast path — cache is already populated (or confirmed absent)
    if (XpConfigService.configLoaded) {
      return XpConfigService.configCache;
    }

    // Create a shared promise so concurrent callers share one DB fetch
    if (!XpConfigService.loadingPromise) {
      XpConfigService.loadingPromise = (async () => {
        try {
          const dbConfig = await XpConfigService.repository.getConfig();

          // Guard: skip if updateConfig() already populated the cache
          // while the DB fetch was in flight (race condition prevention).
          if (!XpConfigService.configLoaded) {
            XpConfigService.configLoaded = true;
            if (dbConfig) {
              XpConfigService.configCache = {
                xpLevels: dbConfig.xpLevels,
                giftSendXp: dbConfig.giftSendXp,
                svipMultipliers: dbConfig.svipMultipliers,
              };
            }
          }

          return XpConfigService.configCache;
        } finally {
          // Always reset loadingPromise — even if the DB fetch throws.
          // This allows subsequent callers to retry with a fresh promise
          // instead of being permanently stuck with a rejected one.
          XpConfigService.loadingPromise = null;
        }
      })();
    }

    return XpConfigService.loadingPromise;
  }

  /**
   * Updates the XP configuration in the database and immediately refreshes
   * the in-memory cache. The new values are instantly visible to XpHelper.
   *
   * @param data Partial configuration data to update.
   * @returns The updated configuration object (from the refreshed cache).
   */
  static async updateConfig(data: Partial<IXpConfig>): Promise<IXpConfig> {
    const updated = await XpConfigService.repository.updateConfig(data);

    const result: IXpConfig = {
      xpLevels: updated.xpLevels,
      giftSendXp: updated.giftSendXp,
      svipMultipliers: updated.svipMultipliers,
    };
    XpConfigService.configCache = result;
    XpConfigService.configLoaded = true;

    return result;
  }
}
