import { ClientSession, Query } from "mongoose";
import { IPagination, QueryBuilder } from "../../core/Utils/query_builder";
import {
  IPortalUser,
  IPortalUserDocument,
  IPortalUserModel,
} from "../../entities/portal_users/portal_user_interface";
import { UserRoles } from "../../core/Utils/enums";

export interface IPortalUserRepository {
  createPortalUser(portalUser: IPortalUser): Promise<IPortalUserDocument>;
  updatePortalUser(
    id: string,
    portalUser: Partial<IPortalUser>
  ): Promise<IPortalUserDocument | null>;
  deletePortalUser(id: string): Promise<IPortalUserDocument | null>;
  getPortalUserById(id: string): Promise<IPortalUserDocument | null>;
  getPortalUserByUserId(username: string): Promise<IPortalUserDocument | null>;
  getPortalUsers(
    userRole: UserRoles,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; data: IPortalUserDocument[] }>;
  updateCoin(
    id: string,
    coins: number,
    session?: ClientSession
  ): Promise<IPortalUserDocument | null>;
  updateDiamonds(
    id: string,
    diamonds: number,
    session?: ClientSession
  ): Promise<IPortalUserDocument | null>;
  getPortalChildUsers(
    userRole: UserRoles,
    parentId: string,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; data: IPortalUserDocument[] }>;
}

export default class PortalUserRepository implements IPortalUserRepository {
  Model: IPortalUserModel;
  constructor(model: IPortalUserModel) {
    this.Model = model;
  }

  async createPortalUser(
    portalUser: IPortalUser
  ): Promise<IPortalUserDocument> {
    const user = new this.Model(portalUser);
    return await user.save();
  }

  async updatePortalUser(
    id: string,
    portalUser: Partial<IPortalUser>
  ): Promise<IPortalUserDocument | null> {
    return await this.Model.findByIdAndUpdate(id, portalUser, { new: true });
  }

  async deletePortalUser(id: string): Promise<IPortalUserDocument | null> {
    return await this.Model.findByIdAndDelete(id);
  }

  async getPortalUserById(id: string): Promise<IPortalUserDocument | null> {
    return await this.Model.findById(id);
  }
  async updateCoin(
    id: string,
    coins: number,
    session?: ClientSession
  ): Promise<IPortalUserDocument | null> {
    return await this.Model.findByIdAndUpdate(
      id,
      { $inc: { coins: coins } },
      { new: true }
    ).session(session || null);
  }
  async updateDiamonds(
    id: string,
    diamonds: number,
    session?: ClientSession
  ): Promise<IPortalUserDocument | null> {
    return await this.Model.findByIdAndUpdate(
      id,
      { $inc: { diamonds: diamonds } },
      { new: true }
    ).session(session || null);
  }

  async getPortalUserByUserId(
    userId: string
  ): Promise<IPortalUserDocument | null> {
    return await this.Model.findOne({ userId });
  }

  async getPortalUsers(
    userRole: UserRoles,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; data: IPortalUserDocument[] }> {
    const qb = new QueryBuilder(this.Model, query);
    const res = qb
      .find({ userRole })
      .search(["name", "userId"])
      .paginate()
      .sort();
    const data = await res.exec();
    const pagination = await res.countTotal();
    return { data, pagination };
  }

  async getPortalChildUsers(
    userRole: UserRoles,
    parentId: string,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; data: IPortalUserDocument[] }> {
    const qb = new QueryBuilder(this.Model, query);
    const res =  qb
      .find({ userRole, parentCreator: parentId })
      .search(["name", "userId"])
      .paginate()
      .sort();
    const data = await res.exec();
    const pagination = await res.countTotal();
    return { data, pagination };
  }
}
