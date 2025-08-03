import { Query } from "mongoose";
import { IPagination, QueryBuilder } from "../../core/Utils/query_builder";
import { IPortalUser, IPortalUserDocument, IPortalUserModel } from "../../entities/portal_users/portal_user_interface";


export interface IPortalUserRepository {
    createPortalUser(portalUser: IPortalUser): Promise<IPortalUserDocument>;
    updatePortalUser(id: string, portalUser: Partial<IPortalUser>): Promise<IPortalUserDocument | null>;
    deletePortalUser(id: string): Promise<IPortalUserDocument | null>;
    getPortalUserById(id: string): Promise<IPortalUserDocument | null>;
    getPortalUserByUserId(username: string): Promise<IPortalUserDocument | null>;
    getPortalUsers(query: Record<string, any>): Promise<{ pagination: IPagination, users: IPortalUserDocument[] }>;
}


export default class PortalUserRepository implements IPortalUserRepository {
    Model: IPortalUserModel;
    constructor(model: IPortalUserModel) {
        this.Model = model;
    }

    async createPortalUser(portalUser: IPortalUser): Promise<IPortalUserDocument> {
        const user = new this.Model(portalUser);
        return await user.save();
    }

    async updatePortalUser(id: string, portalUser: Partial<IPortalUser>): Promise<IPortalUserDocument | null> {
        return await this.Model.findByIdAndUpdate(id, portalUser, { new: true });
    }

    async deletePortalUser(id: string): Promise<IPortalUserDocument | null> {
        return await this.Model.findByIdAndDelete(id);
    }

    async getPortalUserById(id: string): Promise<IPortalUserDocument | null> {
        return await this.Model.findById(id);
    }

    async getPortalUserByUserId(userId: string): Promise<IPortalUserDocument | null> {
        return await this.Model.findOne({ userId });
    }

    async getPortalUsers(query: Record<string, any>): Promise<{ pagination: IPagination, users: IPortalUserDocument[] }> {
      const qb = new QueryBuilder(this.Model, query);
        const users = await qb.search(["name", "userId"]).paginate().sort().exec();
        const pagination = await qb.countTotal();
        return { users, pagination };
    }
    
}