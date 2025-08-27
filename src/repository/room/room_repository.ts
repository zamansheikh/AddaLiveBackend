import mongoose, { DeleteResult, mongo, UpdateResult } from "mongoose";
import {
  IRoomHistory,
  IRoomHistoryDocument,
  IRoomHistoryModel,
} from "../../models/room/room_history_model";
import { start } from "repl";
import { getWithdrawDateBoundaires } from "../../core/Utils/helper_functions";
import { StreamType } from "../../core/Utils/enums";

export interface IRoomHistoryRepository {
  resetRoomHistory(): Promise<DeleteResult>;
  createRoomHistory(roomHistory: IRoomHistory): Promise<IRoomHistoryDocument>;
  getEligibleRoom(id: string): Promise<IRoomHistoryDocument | null>;
  getNextEligible(id: string, startDate: Date): Promise<number>;
  getIsDone(Id: string): Promise<IRoomHistoryDocument | null>;
  getDayCount(id: string): Promise<number>;
  getTimeCount(id: string): Promise<number>;
  getAudioHour(id: string): Promise<number>;
  getVideoHour(id: string): Promise<number>;
}

export default class RoomHistoryRepository implements IRoomHistoryRepository {
  Model: IRoomHistoryModel;

  constructor(model: IRoomHistoryModel) {
    this.Model = model;
  }

  async createRoomHistory(
    roomHistory: IRoomHistory
  ): Promise<IRoomHistoryDocument> {
    const history = new this.Model(roomHistory);
    return history.save();
  }

  async resetRoomHistory(): Promise<DeleteResult> {
    const startOfToday = new Date(Date.now());
    startOfToday.setHours(0, 0, 0, 0);
    return this.Model.deleteMany({ createdAt: { $lt: startOfToday } });
  }

  async getEligibleRoom(id: string): Promise<IRoomHistoryDocument | null> {
    return await this.Model.findOne({ host: id, firstEligible: true });
  }

  async getIsDone(Id: string): Promise<IRoomHistoryDocument | null> {
    return await this.Model.findOne({ host: Id, isDone: true });
  }

  async getNextEligible(id: string, startDate: Date): Promise<number> {
    const totalSum = await this.Model.aggregate([
      {
        $match: {
          host: new mongoose.Types.ObjectId(id),
          createdAt: { $gt: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalDuration: { $sum: "$totalLive" },
        },
      },
    ]);

    return totalSum[0]?.totalDuration ?? 0;
  }

  async getDayCount(id: string): Promise<number> {
    const { gte, lte } = getWithdrawDateBoundaires();
    const totalSum = await this.Model.aggregate([
      {
        $match: {
          host: new mongoose.Types.ObjectId(id),
          totalLive: { $gte: 50 },
          type: StreamType.Video,
          createdAt: { $gte: gte, $lte: lte },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      {
        $count: "totalDays",
      },
    ]);
    return totalSum[0]?.totalDays ?? 0;
  }

  async getTimeCount(id: string): Promise<number> {
    const { gte, lte } = getWithdrawDateBoundaires();
    const totalSum = await this.Model.aggregate([
      {
        $match: {
          host: new mongoose.Types.ObjectId(id),
          createdAt: { $gte: gte, $lte: lte },
        },
      },
      {
        $group: {
          _id: null,
          totalHour: { $sum: "$totalLive" },
        },
      },
    ]);
    return totalSum[0]?.totalHour ?? 0;
  }

  async getAudioHour(id: string): Promise<number> {
    const { gte, lte } = getWithdrawDateBoundaires();
    const totalSum = await this.Model.aggregate([
      {
        $match: {
          host: new mongoose.Types.ObjectId(id),
          createdAt: { $gte: gte, $lte: lte },
          type: "audio",
        },
      },
      {
        $group: {
          _id: null,
          totalHour: { $sum: "$totalLive" },
        },
      },
    ]);
    return totalSum[0]?.totalHour ?? 0;
    

  }

  async getVideoHour(id: string): Promise<number> {
    const { gte, lte } = getWithdrawDateBoundaires();
    const totalSum = await this.Model.aggregate([
      {
        $match: {
          host: new mongoose.Types.ObjectId(id),
          createdAt: { $gte: gte, $lte: lte },
          type: "video",
        },
      },
      {
        $group: {
          _id: null,
          totalHour: { $sum: "$totalLive" },
        },
      },
    ]);
    return totalSum[0]?.totalHour ?? 0;
    
  }
}
