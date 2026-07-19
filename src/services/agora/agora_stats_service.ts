import {
  AgoraRequestType,
  IAgoraStatsDocument,
} from "../../models/agora/agora_stats_model";
import AgoraStatsRepository, {
  IAgoraStatsRepository,
} from "../../repository/agora/agora_stats_repository";

export interface IAgoraStatsService {
  getStats(): Promise<IAgoraStatsDocument>;
  increment(type: AgoraRequestType): Promise<void>;
  reset(): Promise<IAgoraStatsDocument>;
}

export class AgoraStatsService implements IAgoraStatsService {
  private repository: IAgoraStatsRepository;

  constructor(repository: IAgoraStatsRepository = new AgoraStatsRepository()) {
    this.repository = repository;
  }

  async getStats(): Promise<IAgoraStatsDocument> {
    return await this.repository.getStats();
  }

  async increment(type: AgoraRequestType): Promise<void> {
    await this.repository.increment(type);
  }

  async reset(): Promise<IAgoraStatsDocument> {
    return await this.repository.reset();
  }
}

// Shared singleton so the public token controller and the admin stats
// controller record into / read from the same instance.
export const agoraStatsService = new AgoraStatsService();
