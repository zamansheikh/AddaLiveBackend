import {
  IAgencyWithdraw,
  IAgencyWithdrawDocument,
  IAgencyWithdrawModel,
} from "../../models/room/agency_withdraw_model";
import { IWithdrawBonus } from "../../models/room/withdraw_bonus_model";
import { StatusTypes } from "../../core/Utils/enums";
import AppError from "../../core/errors/app_errors";
import { StatusCodes } from "http-status-codes";
import { ClientSession } from "mongoose";
import { IPagination, QueryBuilder } from "../../core/Utils/query_builder";

export interface IAgencyWithdrawRepository {
  createWithdraw(
    data: IAgencyWithdraw,
    session?: ClientSession
  ): Promise<IAgencyWithdrawDocument>;
  getWithdrawById(id: string): Promise<IAgencyWithdrawDocument | null>;
  getWithdrawWithStatus(
    agencyId: string,
    status: StatusTypes
  ): Promise<IAgencyWithdrawDocument | null>;
  updateWithdraw(
    id: string,
    data: Partial<IAgencyWithdraw>
  ): Promise<IAgencyWithdrawDocument>;

  getAgencyWithdrawlist(query: Record<string, unknown>): Promise<{pagination: IPagination, data: IAgencyWithdrawDocument[]}>;
}

export default class AgencyWithdrawRepository
  implements IAgencyWithdrawRepository
{
  Model: IAgencyWithdrawModel;

  constructor(model: IAgencyWithdrawModel) {
    this.Model = model;
  }

  async createWithdraw(
    data: IAgencyWithdraw,
    session?: ClientSession
  ): Promise<IAgencyWithdrawDocument> {
    const newWithdraw = new this.Model(data);
    return newWithdraw.save({ session });
  }

  async getWithdrawById(id: string): Promise<IAgencyWithdrawDocument | null> {
    return await this.Model.findById(id);
  }

  async getWithdrawWithStatus(
    agencyId: string,
    status: StatusTypes
  ): Promise<IAgencyWithdrawDocument | null> {
    return await this.Model.findOne({ agencyId, status });
  }

  async updateWithdraw(
    id: string,
    data: Partial<IAgencyWithdraw>
  ): Promise<IAgencyWithdrawDocument> {
    const updated = await this.Model.findByIdAndUpdate(id, data, { new: true });
    if (!updated) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        `id -> ${id} with data -> ${JSON.stringify(data)} has failed to update`
      );
    }
    return updated;
  }

  async getAgencyWithdrawlist(query: Record<string, unknown>): Promise<{ pagination: IPagination; data: IAgencyWithdrawDocument[]; }> {
    const qb = new QueryBuilder(this.Model, query);
    const res = qb.find({status: StatusTypes.pending}).sort();
    const data = await res.exec();
    const pagination = await res.countTotal();
    return { pagination, data };
  }
}
