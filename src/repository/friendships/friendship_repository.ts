import mongoose from "mongoose";
import { DatabaseNames, FriendshipStatus, RequestTypes } from "../../core/Utils/enums";
import { IPagination, QueryBuilder } from "../../core/Utils/query_builder";
import { IFriendship, IFriendshipDocument, IFriendshipModel } from "../../entities/friendship/friendship_model_interface";
import IFriendshipRepository, { ICondition } from "./friendship_repository_interface";

class FriendshipRepository implements IFriendshipRepository {

    friendsModel: IFriendshipModel;

    constructor(friendsModel: IFriendshipModel) {
        this.friendsModel = friendsModel;
    }

    async createFriendShip(friendship: IFriendship, session?: mongoose.ClientSession): Promise<IFriendshipDocument | null> {
        const newFriendship = new this.friendsModel(friendship);
        return await newFriendship.save({ session });
    }

    async deleteFriendship(id: string, session?: mongoose.ClientSession): Promise<IFriendshipDocument | null> {
        return await this.friendsModel.findByIdAndDelete(id).session(session || null);
    }

    async existingFriendship(friendship: IFriendship, session?: mongoose.ClientSession): Promise<IFriendshipDocument | null> {
        const existing = await this.friendsModel.findOne({
            $or: [
                { user1: friendship.user1, user2: friendship.user2 },
                { user1: friendship.user2, user2: friendship.user1 }
            ]
        }).session(session || null);
        return existing;
    }

    async getFriendShipCount(userId: string): Promise<number> {
        return await this.friendsModel.countDocuments({ $or: [{ user1: userId }, { user2: userId }] });
    }

}

export default FriendshipRepository;