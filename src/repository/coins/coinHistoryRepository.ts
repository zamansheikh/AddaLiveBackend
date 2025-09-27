import { ClientSession, Types } from "mongoose";
import { DatabaseNames, UserRoles } from "../../core/Utils/enums";
import { IPagination, QueryBuilder } from "../../core/Utils/query_builder";
import {
  ICoinHistory,
  ICoinHistoryDocument,
  ICoinHistoryModel,
} from "../../models/coins/coinHistoryModel";

export interface ICoinHistoryRepository {
  createHistory(
    data: ICoinHistory,
    session?: ClientSession
  ): Promise<ICoinHistoryDocument>;
  getAdminHistories(
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; data: ICoinHistoryDocument[] }>;
  getPortalHistory(
    senderId: string,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; data: ICoinHistoryDocument[] }>;

  //   getMerchantHistories(
  //     query: Record<string, any>
  //   ): Promise<{ pagination: IPagination; data: ICoinHistoryDocument[] }>;
  //   getResellerHistories(
  //     query: Record<string, any>
  //   ): Promise<{ pagination: IPagination; data: ICoinHistoryDocument[] }>;
}

export default class CoinHistoryRepository implements ICoinHistoryRepository {
  Model: ICoinHistoryModel;
  constructor(model: ICoinHistoryModel) {
    this.Model = model;
  }

  async createHistory(
    data: ICoinHistory,
    session?: ClientSession
  ): Promise<ICoinHistoryDocument> {
    const history = new this.Model(data);
    return await history.save({ session });
  }

  async getAdminHistories(
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; data: ICoinHistoryDocument[] }> {
    const qb = new QueryBuilder(this.Model, query);
    const res = qb.aggregate([
      {
        $match: {
          senderRole: UserRoles.Admin,
        },
      },
      {
        $lookup: {
          from: DatabaseNames.PortalUsers,
          localField: "receiverId",
          foreignField: "_id",
          as: "receiver",
        },
      },
      {
        $unwind: "$receiver",
      },
    ]);

    const data = await res.sort().exec();
    const pagination = await res.countTotal();
    return {
      pagination,
      data,
    };
  }

  async getPortalHistory(
    senderId: string,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; data: ICoinHistoryDocument[] }> {
    const sender = new Types.ObjectId(senderId);
    const qb = new QueryBuilder(this.Model, query);
    const res = qb.aggregate([
      {
        $match: {
          senderId: sender,
        },
      },
      {
        $lookup: {
          from: DatabaseNames.User,
          foreignField: "_id",
          localField: "receiverId",
          as: "userInfo",
        },
      },
      {
        $lookup: {
          from: DatabaseNames.PortalUsers,
          foreignField: "_id",
          localField: "receiverId",
          as: "portalUserInfo",
        },
      },
      {
        $unwind: {
          path: "$userInfo", 
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$portalUserInfo", 
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          senderId: 1,
          senderRole: 1,
          receiverRole: 1,
          amount: 1,
          createdAt: 1,
          portalUserInfo: {
            _id: 1,
            name: 1,
            userId: 1,
            coins: 1,
            designation: 1,
          },
          userInfo: {
            _id: 1,
            name: 1,
            email: 1,
            uid: 1,
            userRole: 1,
            avatar: 1,
            level: 1,
          }
        }
      }
    ]);

    const data = await res.sort().exec();
    const pagination = await res.countTotal();
    return {
      pagination,
      data,
    };
  }
}
