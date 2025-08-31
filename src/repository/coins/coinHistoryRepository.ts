import { ClientSession } from "mongoose";
import { DatabaseNames, UserRoles } from "../../core/Utils/enums";
import { IPagination, QueryBuilder } from "../../core/Utils/query_builder";
import {
  ICoinHistory,
  ICoinHistoryDocument,
  ICoinHistoryModel,
} from "../../models/coins/coinHistoryModel";

export interface ICoinHistoryRepository {
  createHistory(data: ICoinHistory, session?: ClientSession): Promise<ICoinHistoryDocument>;
  getAdminHistories(
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

  async createHistory(data: ICoinHistory, session?: ClientSession): Promise<ICoinHistoryDocument> {
    const history = new this.Model(data);
    return await history.save({session});
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

    const data = await res.exec();
    const pagination = await res.countTotal();
    return {
      pagination,
      data,
    };
  }
}
