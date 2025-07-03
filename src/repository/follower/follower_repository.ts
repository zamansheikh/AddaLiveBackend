import { Query } from "mongoose";
import { IPagination, QueryBuilder } from "../../core/Utils/query_builder";
import { IFollower, IFollowerDocument, IFollowerModel } from "../../entities/followers/follower_model_interface";

export interface IFollowerRepository {
    createFollower(follow: IFollower): Promise<IFollowerDocument | null>
    findFollower(follow: IFollower): Promise<IFollowerDocument | null>;
    deleteFollowerById(id: string): Promise<IFollowerDocument | null>;
    getFollowerLists(condition: Record<string, string>, query: Record<string, any>): Promise<{ pagination: IPagination, data: IFollowerDocument[] } | null>;
}


export default class FollowerRepository implements IFollowerRepository {
    Model: IFollowerModel;
    constructor(model: IFollowerModel) {
        this.Model = model;
    }

    async createFollower(follow: IFollower): Promise<IFollowerDocument | null> {
        const newFollower = new this.Model(follow);
        return await newFollower.save();
    }

    async findFollower(follow: IFollower): Promise<IFollowerDocument | null> {
        return await this.Model.findOne(follow);
    }

    async deleteFollowerById(id: string): Promise<IFollowerDocument | null> {
        return await this.Model.findByIdAndDelete(id);
    }

    async getFollowerLists(condition: Record<string, string>, query: Record<string, any>): Promise<{ pagination: IPagination; data: IFollowerDocument[]; } | null> {
        const qb = new QueryBuilder(this.Model, query);
        const res = qb.find(condition).populateField("myId followerId", "name avatar").sort().paginate();
        const data = await res.exec();
        const pagination = await res.countTotal();
        return { pagination, data };
    }

}