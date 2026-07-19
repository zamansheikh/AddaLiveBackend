import AgoraStatsModel, {
  AgoraRequestType,
  IAgoraStatsDocument,
  IAgoraStatsModel,
} from "../../models/agora/agora_stats_model";

const HISTORY_LIMIT = 100;

export interface IAgoraStatsRepository {
  getStats(): Promise<IAgoraStatsDocument>;
  increment(type: AgoraRequestType): Promise<void>;
  reset(): Promise<IAgoraStatsDocument>;
}

/**
 * Agora request statistics are stored as a single document (the collection
 * holds at most one row). All access goes through `findOneAndUpdate({}, …)`
 * with `upsert`, so the row is created on first use.
 */
export default class AgoraStatsRepository implements IAgoraStatsRepository {
  private Model: IAgoraStatsModel;

  constructor(model: IAgoraStatsModel = AgoraStatsModel) {
    this.Model = model;
  }

  async getStats(): Promise<IAgoraStatsDocument> {
    const doc = await this.Model.findOneAndUpdate(
      {},
      { $setOnInsert: { lastReset: new Date() } },
      { new: true, upsert: true }
    );
    return doc;
  }

  async increment(type: AgoraRequestType): Promise<void> {
    const typeField = `${type}Requests`;
    await this.Model.updateOne(
      {},
      {
        $inc: { totalRequests: 1, [typeField]: 1 },
        $push: {
          requestHistory: {
            $each: [{ type, timestamp: new Date() }],
            $position: 0, // newest first
            $slice: HISTORY_LIMIT,
          },
        },
        $setOnInsert: { lastReset: new Date() },
      },
      { upsert: true }
    );
  }

  async reset(): Promise<IAgoraStatsDocument> {
    const doc = await this.Model.findOneAndUpdate(
      {},
      {
        $set: {
          totalRequests: 0,
          rtcRequests: 0,
          rtmRequests: 0,
          adminRequests: 0,
          lastReset: new Date(),
          requestHistory: [],
        },
      },
      { new: true, upsert: true }
    );
    return doc;
  }
}
