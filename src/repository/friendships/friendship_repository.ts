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

    async getFriendLists(userId: string, query: Record<string, unknown>): Promise<{ pagination: IPagination; data: IFriendshipDocument[]; }> {
        const qb = new QueryBuilder(this.friendsModel, query);
        const result = qb.aggregate([
            {
                $match: {
                    $or: [
                        { user1: new mongoose.Types.ObjectId(userId) },
                        { user2: new mongoose.Types.ObjectId(userId) }
                    ]
                },
            },
            {
                $lookup: {
                    from: DatabaseNames.User,
                    localField: "user1",
                    foreignField: "_id",
                    as: "user1Info",
                }
            },
            {
                $lookup: {
                    from: DatabaseNames.User,
                    localField: "user2",
                    foreignField: "_id",
                    as: "user2Info",
                }
            },
            {
                $addFields: {
                    friendInfo: {
                        $cond: [
                            { $eq: ["$user1", new mongoose.Types.ObjectId(userId)] },
                            "$user2Info",
                            "$user1Info"
                        ]
                    },
                    myInfo: {
                        $cond: [
                            { $eq: ["$user1", new mongoose.Types.ObjectId(userId)] },
                            "$user1Info",
                            "$user2Info"
                        ]
                    }
                }
            },
            {
                $unwind: {
                    path: "$friendInfo",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: "$myInfo",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    user1: 1,
                    user2: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    friendInfo: {
                        _id: "$friendInfo._id",
                        name: "$friendInfo.name",
                        avatar: "$friendInfo.avatar",
                        level: "$friendInfo.level",
                        currentLevelTag: "$friendInfo.currentLevelTag",
                        currentLevelBackground: "$friendInfo.currentLevelBackground"
                    },
                    myInfo: {
                        _id: "$myInfo._id",
                        name: "$myInfo.name",
                        avatar: "$myInfo.avatar",
                        level: "$myInfo.level",
                        currentLevelTag: "$myInfo.currentLevelTag",
                        currentLevelBackground: "$myInfo.currentLevelBackground"
                    }
                }
            }
        ]).paginate();

        const data = await result.exec();
        const pagination = await result.countTotal();
        return { pagination, data };
    }

}

export default FriendshipRepository;