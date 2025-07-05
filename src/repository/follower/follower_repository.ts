import { ClientSession, Query } from "mongoose";
import { IPagination, QueryBuilder } from "../../core/Utils/query_builder";
import { IFollower, IFollowerDocument, IFollowerModel } from "../../entities/followers/follower_model_interface";


export interface IFollowerRepository {
    createFollower(follow: IFollower, session?: ClientSession): Promise<IFollowerDocument | null>
    findFollower(follow: IFollower, session?: ClientSession): Promise<IFollowerDocument | null>;
    deleteFollowerById(id: string, session?: ClientSession): Promise<IFollowerDocument | null>;
    getFollowerLists(condition: Record<string, string>, query: Record<string, any>): Promise<{ pagination: IPagination, data: IFollowerDocument[] } | null>;
    getFollowerCount(userId: string): Promise<number>;
    getFollowingCount(userId: string): Promise<number>;
}


export default class FollowerRepository implements IFollowerRepository {
    Model: IFollowerModel;
    constructor(model: IFollowerModel) {
        this.Model = model;
    }

    async createFollower(follow: IFollower, session?: ClientSession): Promise<IFollowerDocument | null> {
        const newFollower = new this.Model(follow);
        return await newFollower.save({session});
    }

    async findFollower(follow: IFollower, session?: ClientSession): Promise<IFollowerDocument | null> {
        return await this.Model.findOne(follow).session(session || null);
    }

    async deleteFollowerById(id: string, session?: ClientSession): Promise<IFollowerDocument | null> {
        return await this.Model.findByIdAndDelete(id).session(session || null);
    }

    async getFollowerLists(condition: Record<string, string>, query: Record<string, any>): Promise<{ pagination: IPagination; data: IFollowerDocument[]; } | null> {
        const qb = new QueryBuilder(this.Model, query);
        const res = qb.find(condition).populateField("myId followerId", "name avatar").sort().paginate();
        const data = await res.exec();
        const pagination = await res.countTotal();
        return { pagination, data };
    }

    async getFollowerCount(userId: string): Promise<number> {
        return await this.Model.countDocuments({ myId: userId });
    }

    async getFollowingCount(userId: string): Promise<number> {
        return await this.Model.countDocuments({ followerId: userId });
    }

}