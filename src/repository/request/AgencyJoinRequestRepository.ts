import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IPagination, QueryBuilder } from "../../core/Utils/query_builder";
import {
  IAgencyJoinRequest,
  IAgencyJoinRequestDocument,
  IAgencyJoinRequestModel,
} from "../../models/request/agencyJoinRequset";

export interface IAgencyJoinRequestRepository {
  createRequest(data: IAgencyJoinRequest): Promise<IAgencyJoinRequestDocument>;
  updateRequest(
    id: string,
    data: Partial<IAgencyJoinRequest>
  ): Promise<IAgencyJoinRequestDocument>;
  getRequestById(id: string): Promise<IAgencyJoinRequestDocument | null>;
  getRequests(
    agencyId: string,
    query: Record<string, unknown>
  ): Promise<{ pagination: IPagination; data: IAgencyJoinRequest[] }>;
  deleteRequest(id: string): Promise<IAgencyJoinRequestDocument>;
  getRequestCondiionally(
    condition: Partial<IAgencyJoinRequest>
  ): Promise<IAgencyJoinRequestDocument | null>;
}

export default class AgencyJoinRequestRepository
  implements IAgencyJoinRequestRepository
{
  Model: IAgencyJoinRequestModel;

  constructor(model: IAgencyJoinRequestModel) {
    this.Model = model;
  }

  async createRequest(
    data: IAgencyJoinRequest
  ): Promise<IAgencyJoinRequestDocument> {
    const newRequest = new this.Model(data);
    return await newRequest.save();
  }

  async updateRequest(
    id: string,
    data: Partial<IAgencyJoinRequest>
  ): Promise<IAgencyJoinRequestDocument> {
    const update = await this.Model.findByIdAndUpdate(id, data, { new: true });
    if (!update) throw new AppError(StatusCodes.NOT_FOUND, "Request not found");
    return update;
  }

  async getRequestById(id: string): Promise<IAgencyJoinRequestDocument | null> {
    const request = await this.Model.findById(id);
    return request;
  }

  async getRequests(
    agencyId: string,
    query: Record<string, unknown>
  ): Promise<{ pagination: IPagination; data: IAgencyJoinRequest[] }> {
    const qb = new QueryBuilder(this.Model, query);
    const res = qb.find({ agencyId }).sort().useLean().paginate();
    const data = await res.exec();
    const pagination = await res.countTotal();
    return { pagination, data };
  }

  async deleteRequest(id: string): Promise<IAgencyJoinRequestDocument> {
    const deleted = await this.Model.findByIdAndDelete(id);
    if (!deleted)
      throw new AppError(StatusCodes.NOT_FOUND, "Request not found");
    return deleted;
  }

  async getRequestCondiionally(
    condition: Partial<IAgencyJoinRequest>
  ): Promise<IAgencyJoinRequestDocument | null> {
    const request = await this.Model.findOne(condition);
    return request;
  }
}
