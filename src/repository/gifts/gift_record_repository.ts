import mongoose from "mongoose";
import { DateHelper } from "../../core/helper_classes/date_helper";
import { DatabaseNames, RankingPeriods } from "../../core/Utils/enums";
import {
  lookupRichUser,
  lookupRoom,
  userWithEquippedItemsPipeline,
} from "../../core/Utils/helper_pipelines";
import { IMemberDetails } from "../../models/audio_room/audio_room_model";
import {
  IGiftRecord,
  IGiftRecordModel,
} from "../../models/gifts/gift_record_model";

export interface IRanking {
  amount: number;
  memberDetails?: IMemberDetails;
  roomDetails?: {
    roomPhoto: string;
    roomName: string;
    hostLevel: number;
  };
}
export interface IRoomRanking {
  totalRoomTransaction: number;
  ranking: IRanking[];
}

export interface IGiftRecordRepository {
  createGiftRecord(giftRecord: IGiftRecord): Promise<boolean>;
  getSenderRanking(period: RankingPeriods): Promise<IRanking[]>;
  getMySendAmount(myId: string, period: RankingPeriods): Promise<IRanking>;
  getReceiverRanking(myId: string, period: RankingPeriods): Promise<IRanking[]>;
  getMyReceiveAmount(myId: string, period: RankingPeriods): Promise<IRanking>;
  getRoomRanking(period: RankingPeriods): Promise<IRanking[]>;
  getMyRoomAmount(myId: string, period: RankingPeriods): Promise<IRanking>;
  getRoomSenderRanking(roomId: string): Promise<IMemberDetails[]>;
  getInsideRoomRanking(
    roomId: string,
    period: RankingPeriods,
  ): Promise<IRanking[]>;
  getTotalRoomTransaction(roomId: string): Promise<number>;
  getMyRoomContribution(
    myId: string,
    roomId: string,
    period: RankingPeriods,
  ): Promise<IRanking>;
  getMyReceivedAmountInRoom(myId: string, roomId: string): Promise<number>;
  getFamilyRanking(lastWeek: boolean): Promise<
    {
      familyId: string;
      familyName: string;
      familyCoverPhoto: string;
      totalContribution: number;
      leader: {
        memberId: string;
        memberName: string;
        memberPhoto: string;
      };
    }[]
  >;
  getWeeklyFamilyContributors(
    familyId: string,
    startDate: Date,
    endDate: Date,
    limit: number,
  ): Promise<{ receiverId: string; weeklyContribution: number }[]>;
}

export class GiftRecordRepository implements IGiftRecordRepository {
  Model: IGiftRecordModel;
  constructor(model: IGiftRecordModel) {
    this.Model = model;
  }
  async createGiftRecord(giftRecord: IGiftRecord): Promise<boolean> {
    try {
      // determine ttl -> always currents months last date.
      // const currentMonthLastDate = DateHelper.getEndOfMonth(new Date());
      const newGiftRecord = new this.Model({
        ...giftRecord,
        // expireAt: currentMonthLastDate,
      });
      await newGiftRecord.save();
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  async getSenderRanking(period: RankingPeriods): Promise<IRanking[]> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === RankingPeriods.Daily) {
      startDate = DateHelper.getStartOfDay(now);
      endDate = DateHelper.getEndOfDay(now);
    } else if (period === RankingPeriods.Weekly) {
      startDate = DateHelper.getStartOfWeek(now);
      endDate = DateHelper.getEndOfWeek(now);
    } else {
      startDate = DateHelper.getStartOfMonth(now);
      endDate = DateHelper.getEndOfMonth(now);
    }

    const ranking: IRanking[] = await this.Model.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$senderId",
          amount: { $sum: "$totalCoinCost" },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: 100 },
      lookupRichUser("_id", "memberDetails"),
      { $unwind: "$memberDetails" },
      {
        $project: {
          _id: 0,
          memberDetails: 1,
          amount: 1,
        },
      },
    ]);

    return ranking;
  }

  async getMySendAmount(
    myId: string,
    period: RankingPeriods,
  ): Promise<IRanking> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === RankingPeriods.Daily) {
      startDate = DateHelper.getStartOfDay(now);
      endDate = DateHelper.getEndOfDay(now);
    } else if (period === RankingPeriods.Weekly) {
      startDate = DateHelper.getStartOfWeek(now);
      endDate = DateHelper.getEndOfWeek(now);
    } else {
      startDate = DateHelper.getStartOfMonth(now);
      endDate = DateHelper.getEndOfMonth(now);
    }

    const ranking: IRanking[] = await this.Model.aggregate([
      {
        $match: {
          senderId: new mongoose.Types.ObjectId(myId),
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$senderId",
          amount: { $sum: "$totalCoinCost" },
        },
      },
      lookupRichUser("_id", "memberDetails"),
      { $unwind: "$memberDetails" },
      {
        $project: {
          _id: 0,
          memberDetails: 1,
          amount: 1,
        },
      },
    ]);

    if (ranking.length > 0) {
      return ranking[0];
    }

    // Fallback: Fetch user details even if no coins were sent in this period
    const userDetails = await this.Model.db
      .model(DatabaseNames.User)
      .aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(myId) } },
        ...userWithEquippedItemsPipeline("dummy").slice(1),
      ]);

    return {
      amount: 0,
      memberDetails: userDetails[0] || ({} as any),
    };
  }

  async getMyReceiveAmount(
    myId: string,
    period: RankingPeriods,
  ): Promise<IRanking> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === RankingPeriods.Daily) {
      startDate = DateHelper.getStartOfDay(now);
      endDate = DateHelper.getEndOfDay(now);
    } else if (period === RankingPeriods.Weekly) {
      startDate = DateHelper.getStartOfWeek(now);
      endDate = DateHelper.getEndOfWeek(now);
    } else {
      startDate = DateHelper.getStartOfMonth(now);
      endDate = DateHelper.getEndOfMonth(now);
    }

    const ranking: IRanking[] = await this.Model.aggregate([
      {
        $match: {
          receiverId: new mongoose.Types.ObjectId(myId),
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$receiverId",
          amount: { $sum: "$totalDiamonds" },
        },
      },
      lookupRichUser("_id", "memberDetails"),
      { $unwind: "$memberDetails" },
      {
        $project: {
          _id: 0,
          memberDetails: 1,
          amount: 1,
        },
      },
    ]);

    if (ranking.length > 0) {
      return ranking[0];
    }

    // Fallback: Fetch user details even if no coins were received in this period
    const userDetails = await this.Model.db
      .model(DatabaseNames.User)
      .aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(myId) } },
        ...userWithEquippedItemsPipeline("dummy").slice(1),
      ]);

    return {
      amount: 0,
      memberDetails: userDetails[0] || ({} as any),
    };
  }

  async getReceiverRanking(
    myId: string,
    period: RankingPeriods,
  ): Promise<IRanking[]> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === RankingPeriods.Daily) {
      startDate = DateHelper.getStartOfDay(now);
      endDate = DateHelper.getEndOfDay(now);
    } else if (period === RankingPeriods.Weekly) {
      startDate = DateHelper.getStartOfWeek(now);
      endDate = DateHelper.getEndOfWeek(now);
    } else {
      startDate = DateHelper.getStartOfMonth(now);
      endDate = DateHelper.getEndOfMonth(now);
    }

    const ranking: IRanking[] = await this.Model.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$receiverId",
          amount: { $sum: "$totalDiamonds" },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: 100 },
      lookupRichUser("_id", "memberDetails"),
      { $unwind: "$memberDetails" },
      {
        $project: {
          _id: 0,
          memberDetails: 1,
          amount: 1,
        },
      },
    ]);

    return ranking;
  }

  async getRoomRanking(period: RankingPeriods): Promise<IRanking[]> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === RankingPeriods.Daily) {
      startDate = DateHelper.getStartOfDay(now);
      endDate = DateHelper.getEndOfDay(now);
    } else if (period === RankingPeriods.Weekly) {
      startDate = DateHelper.getStartOfWeek(now);
      endDate = DateHelper.getEndOfWeek(now);
    } else {
      startDate = DateHelper.getStartOfMonth(now);
      endDate = DateHelper.getEndOfMonth(now);
    }

    const ranking: IRanking[] = await this.Model.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$roomId",
          amount: { $sum: "$totalDiamonds" },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: 100 },
      lookupRoom("_id", "roomDetails"),
      { $unwind: "$roomDetails" },
      {
        $project: {
          _id: 0,
          roomDetails: 1,
          amount: 1,
        },
      },
    ]);

    return ranking;
  }

  async getMyRoomAmount(
    myId: string,
    period: RankingPeriods,
  ): Promise<IRanking> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === RankingPeriods.Daily) {
      startDate = DateHelper.getStartOfDay(now);
      endDate = DateHelper.getEndOfDay(now);
    } else if (period === RankingPeriods.Weekly) {
      startDate = DateHelper.getStartOfWeek(now);
      endDate = DateHelper.getEndOfWeek(now);
    } else {
      startDate = DateHelper.getStartOfMonth(now);
      endDate = DateHelper.getEndOfMonth(now);
    }

    const result = await this.Model.db
      .model(DatabaseNames.AudioRoom)
      .aggregate([
        {
          $match: { hostId: new mongoose.Types.ObjectId(myId) },
        },
        {
          $lookup: {
            from: DatabaseNames.User,
            localField: "hostId",
            foreignField: "_id",
            as: "hostInfo",
          },
        },
        {
          $unwind: { path: "$hostInfo", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: DatabaseNames.GiftRecords,
            let: { rId: "$roomId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$roomId", "$$rId"] },
                      { $gte: ["$createdAt", startDate] },
                      { $lte: ["$createdAt", endDate] },
                    ],
                  },
                },
              },
              {
                $group: {
                  _id: null,
                  total: { $sum: "$totalDiamonds" },
                },
              },
            ],
            as: "giftData",
          },
        },
        {
          $unwind: { path: "$giftData", preserveNullAndEmptyArrays: true },
        },
        {
          $project: {
            _id: 0,
            amount: { $ifNull: ["$giftData.total", 0] },
            roomDetails: {
              roomPhoto: "$roomPhoto",
              roomName: "$title",
              hostLevel: { $ifNull: ["$hostInfo.level", 0] },
            },
          },
        },
      ]);

    if (result.length > 0) {
      return result[0];
    }

    return {
      amount: 0,
      roomDetails: {
        roomPhoto: "",
        roomName: "Not a host",
        hostLevel: 0,
      },
    };
  }

  async getRoomSenderRanking(roomId: string): Promise<IMemberDetails[]> {
    // Aggregate top senders within a specific room based on totalCoinCost
    const ranking = await this.Model.aggregate([
      {
        $match: {
          roomId: roomId,
        },
      },
      {
        $group: {
          _id: "$senderId",
          totalCoins: { $sum: "$totalCoinCost" },
        },
      },
      { $sort: { totalCoins: -1 } },
      { $limit: 100 },
      lookupRichUser("_id", "memberDetails"),
      { $unwind: "$memberDetails" },
      {
        $project: {
          _id: 0,
          memberDetails: 1,
          totalCoins: 1,
        },
      },
    ]);

    // Return only the memberDetails array (sorted by totalCoins)
    return ranking.map((r) => (r as any).memberDetails as IMemberDetails);
  }

  async getInsideRoomRanking(
    roomId: string,
    period: RankingPeriods,
  ): Promise<IRanking[]> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === RankingPeriods.Daily) {
      startDate = DateHelper.getStartOfDay(now);
      endDate = DateHelper.getEndOfDay(now);
    } else if (period === RankingPeriods.Weekly) {
      startDate = DateHelper.getStartOfWeek(now);
      endDate = DateHelper.getEndOfWeek(now);
    } else {
      startDate = DateHelper.getStartOfMonth(now);
      endDate = DateHelper.getEndOfMonth(now);
    }

    const ranking: IRanking[] = await this.Model.aggregate([
      {
        $match: {
          roomId: roomId,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$senderId",
          amount: { $sum: "$totalCoinCost" },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: 100 },
      lookupRichUser("_id", "memberDetails"),
      { $unwind: "$memberDetails" },
      {
        $project: {
          _id: 0,
          memberDetails: 1,
          amount: 1,
        },
      },
    ]);

    return ranking;
  }

  async getTotalRoomTransaction(roomId: string): Promise<number> {
    const result = await this.Model.aggregate([
      {
        $match: {
          roomId: roomId,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalCoinCost" },
        },
      },
    ]);

    return result[0]?.total || 0;
  }

  async getMyRoomContribution(
    myId: string,
    roomId: string,
    period: RankingPeriods,
  ): Promise<IRanking> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === RankingPeriods.Daily) {
      startDate = DateHelper.getStartOfDay(now);
      endDate = DateHelper.getEndOfDay(now);
    } else if (period === RankingPeriods.Weekly) {
      startDate = DateHelper.getStartOfWeek(now);
      endDate = DateHelper.getEndOfWeek(now);
    } else {
      startDate = DateHelper.getStartOfMonth(now);
      endDate = DateHelper.getEndOfMonth(now);
    }

    const ranking: IRanking[] = await this.Model.aggregate([
      {
        $match: {
          senderId: new mongoose.Types.ObjectId(myId),
          roomId: roomId,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$senderId",
          amount: { $sum: "$totalCoinCost" },
        },
      },
      lookupRichUser("_id", "memberDetails"),
      { $unwind: "$memberDetails" },
      {
        $project: {
          _id: 0,
          memberDetails: 1,
          amount: 1,
        },
      },
    ]);

    if (ranking.length > 0) {
      return ranking[0];
    }

    // Fallback: Fetch user details even if no coins were sent in this period
    const userDetails = await this.Model.db
      .model(DatabaseNames.User)
      .aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(myId) } },
        ...userWithEquippedItemsPipeline("dummy").slice(1),
      ]);

    return {
      amount: 0,
      memberDetails: userDetails[0] || ({} as any),
    };
  }

  async getMyReceivedAmountInRoom(
    myId: string,
    roomId: string,
  ): Promise<number> {
    const result = await this.Model.aggregate([
      {
        $match: {
          receiverId: new mongoose.Types.ObjectId(myId),
          roomId: roomId,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalDiamonds" },
        },
      },
    ]);

    return result[0]?.total || 0;
  }

  async getFamilyRanking(lastWeek: boolean = false): Promise<any> {
    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    if (lastWeek) {
      startDate = DateHelper.getStartOfLastWeek(now);
      endDate = DateHelper.getEndOfLastWeek(now);
    } else {
      startDate = DateHelper.getStartOfWeek(now);
      endDate = DateHelper.getEndOfWeek(now);
    }

    const ranking = await this.Model.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          familyId: { $exists: true, $nin: [null, ""] },
        },
      },
      {
        $group: {
          _id: "$familyId",
          totalContribution: { $sum: "$totalCoinCost" },
        },
      },
      {
        $lookup: {
          from: DatabaseNames.Family,
          let: { familyId: { $toObjectId: "$_id" } },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$familyId"] } } },
          ],
          as: "familyDetails",
        },
      },
      { $unwind: "$familyDetails" },
      {
        $lookup: {
          from: DatabaseNames.User,
          let: { leaderId: { $toObjectId: "$familyDetails.leaderId" } },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$leaderId"] } } },
          ],
          as: "leaderDetails",
        },
      },
      { $unwind: "$leaderDetails" },
      {
        $project: {
          _id: 0,
          familyId: "$_id",
          familyName: "$familyDetails.name",
          familyCoverPhoto: "$familyDetails.coverPhoto",
          totalContribution: 1,
          leader: {
            memberId: "$leaderDetails._id",
            memberName: "$leaderDetails.name",
            memberPhoto: "$leaderDetails.avatar",
          },
        },
      },
      { $sort: { totalContribution: -1 } },
      { $limit: 100 },
    ]);

    return ranking;
  }

  async getWeeklyFamilyContributors(
    familyId: string,
    startDate: Date,
    endDate: Date,
    limit: number,
  ): Promise<{ receiverId: string; weeklyContribution: number }[]> {
    return await this.Model.aggregate([
      {
        $match: {
          familyId,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$receiverId",
          weeklyContribution: { $sum: "$totalCoinCost" },
        },
      },
      {
        $project: {
          _id: 0,
          receiverId: "$_id",
          weeklyContribution: 1,
        },
      },
      { $sort: { weeklyContribution: -1 } },
      { $limit: limit },
    ]);
  }
}
