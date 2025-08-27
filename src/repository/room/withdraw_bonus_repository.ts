import { ClientSession } from "mongoose";
import { StatusTypes } from "../../core/Utils/enums";
import { IPagination, QueryBuilder } from "../../core/Utils/query_builder";
import {
  IWithdrawBonus,
  IWithdrawBonusDocument,
  IWithdrawBonusModel,
} from "../../models/room/withdraw_bonus_model";

export interface IWithdrawBonusRepository {
  createWithdrawBonus(
    data: IWithdrawBonus,
    session?: ClientSession
  ): Promise<IWithdrawBonusDocument>;
  getBonusDocument(id: string): Promise<IWithdrawBonusDocument | null>;
  getWithDrawBonus(
    query: Record<string, unknown>
  ): Promise<{ pagination: IPagination; data: IWithdrawBonusDocument[] }>;
  getBonusWithId(id: string): Promise<IWithdrawBonusDocument | null>;
  updateWithdrawBonus(
    id: string,
    data: Record<string, unknown>
  ): Promise<IWithdrawBonusDocument | null>;
  getAgencyPerformance(): Promise<{agencyId: string, totalSalarySum: number, totalHost: number}[]>;
}

export default class WithdrawBonusRepository
  implements IWithdrawBonusRepository
{
  Model: IWithdrawBonusModel;

  constructor(model: IWithdrawBonusModel) {
    this.Model = model;
  }

  async createWithdrawBonus(
    data: IWithdrawBonus,
    session?: ClientSession
  ): Promise<IWithdrawBonusDocument> {
    const withdrawBonus = new this.Model(data);
    return await withdrawBonus.save({ session });
  }

  async getBonusDocument(id: string): Promise<IWithdrawBonusDocument | null> {
    return await this.Model.findOne({
      hostId: id,
      status: StatusTypes.pending,
    });
  }

  async getBonusWithId(id: string): Promise<IWithdrawBonusDocument | null> {
    return await this.Model.findById(id);
  }

  async updateWithdrawBonus(
    id: string,
    data: Record<string, unknown>
  ): Promise<IWithdrawBonusDocument | null> {
    return await this.Model.findByIdAndUpdate(id, data, { new: true });
  }

  async getWithDrawBonus(
    query: Record<string, unknown>
  ): Promise<{ pagination: IPagination; data: IWithdrawBonusDocument[] }> {
    const qb = new QueryBuilder(this.Model, query);
    const res = qb
      .sort()
      .find({ status: StatusTypes.pending })
      .populateField("agencyId hostId", "name userId avatar")
      .paginate();
    const data = await res.exec();
    const pagination = await qb.countTotal();
    return { pagination, data };
  }

  async getAgencyPerformance(): Promise<{agencyId: string, totalSalarySum: number, totalHost: number}[]> {
    const result = await this.Model.aggregate([
      {
        $match: {
          status: StatusTypes.pending,
        },
      },
      {
        $group: {
          _id: "$agencyId",
          totalSalarySum: { $sum: "$totalSalary" },
          totalHost: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          agencyId: "$_id",
          totalSalarySum: 1,
          totalHost: 1,
        },
      },
    ]);

    return result;
  }
}
