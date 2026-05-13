import {
  COIN_MAX,
  COIN_MIN,
  REWARD_NUMBERS,
  ROCKET_MILESTONES,
  XP_MAX,
  XP_MIN,
  updateRocketConstants,
} from "../../core/Utils/constants";
import { IRocketConfig } from "../../models/audio_room/rocketconfig";
import { IRocketConfigRepository } from "../../repository/audio_room/rocket_config_repository";
import { RepositoryProviders } from "../../core/providers/repository_providers";

/**
 * Service for managing Rocket Configuration.
 * Handles synchronization between the Database and In-Memory constants.
 */
export interface IRocketConfigService {
  getConfig(): Promise<IRocketConfig | null>;
  updateConfig(data: Partial<IRocketConfig>): Promise<void>;
  syncToMemory(): Promise<void>;
}

export class RocketConfigService implements IRocketConfigService {
  /**
   * Bootstraps the rocket configuration from the database.
   * This should be called once during server startup.
   */
  static async bootstrap(): Promise<void> {
    const repository = RepositoryProviders.rocketConfigRepositoryProvider;
    const service = new RocketConfigService(repository);

    const config = await service.getConfig();
    if (!config) {
      // Seed the database with current constants if empty
      await service.updateConfig({
        milestones: ROCKET_MILESTONES,
        rewardNumbers: REWARD_NUMBERS,
        coinMin: COIN_MIN,
        coinMax: COIN_MAX,
        xpMin: XP_MIN,
        xpMax: XP_MAX,
      });
      console.log("🌱 Rocket Configuration seeded in database from constants.");
    } else {
      await service.syncToMemory();
      console.log("✅ Rocket Configuration synchronized from database.");
    }
  }

  private repository: IRocketConfigRepository;

  constructor(repository: IRocketConfigRepository) {
    this.repository = repository;
  }

  async getConfig(): Promise<IRocketConfig | null> {
    return await this.repository.getConfig();
  }

  async updateConfig(data: Partial<IRocketConfig>): Promise<void> {
    await this.repository.updateConfig(data);
    // Immediately sync changes to memory
    await this.syncToMemory();
  }

  /**
   * Synchronizes the database values with the global constants in memory.
   * Uses array manipulation to update 'const' array references without reassigning them.
   */
  async syncToMemory(): Promise<void> {
    const config = await this.repository.getConfig();

    if (config) {
      // Sync ROCKET_MILESTONES array
      if (config.milestones && config.milestones.length > 0) {
        ROCKET_MILESTONES.length = 0;
        ROCKET_MILESTONES.push(...config.milestones);
      }

      // Sync REWARD_NUMBERS array
      if (config.rewardNumbers && config.rewardNumbers.length > 0) {
        REWARD_NUMBERS.length = 0;
        REWARD_NUMBERS.push(...config.rewardNumbers);
      }

      // Sync primitive values using the helper function
      updateRocketConstants({
        coinMin: config.coinMin,
        coinMax: config.coinMax,
        xpMin: config.xpMin,
        xpMax: config.xpMax,
      });
    }
  }
}
