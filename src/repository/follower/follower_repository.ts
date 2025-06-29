import { IFollower, IFollowerDocument, IFollowerModel } from "../../entities/followers/follower_model_interface";

export interface IFollowerRepository {
    createFollower(follow: IFollower): Promise<IFollowerDocument | null>
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
    
}