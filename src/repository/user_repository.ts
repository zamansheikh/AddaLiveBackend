import mongoose, { mongo } from "mongoose";
import { IUserEntity } from "../entities/user_entity_interface";
import { IUserDocument, IUserModel } from "../models/user/user_model_interface";
import { IUserRepository } from "./user_repository_interface";
import { DatabaseNames } from "../core/Utils/enums";
import Friendship from "../models/friendship/friendship_model";

export default class UserRepository implements IUserRepository {
    UserModel: IUserModel;
    constructor(UserModel: IUserModel) {
        this.UserModel = UserModel;
    }

    async create(UserEntity: IUserEntity) {
        const user = new this.UserModel(UserEntity);
        return await user.save();
    }

    async findUserById(id: string) {
        return await this.UserModel.findById(id).select("-password");
    }

    async getUserDetailsSelectedField(id: string, fields: string[]): Promise<IUserDocument | null> {
        return await this.UserModel.findById(id, fields);
    }
    async findByUID(uid: string) {
        return await this.UserModel.findOne({ uid }).select("-password");
    }

    async findAllUser() {
        return await this.UserModel.find().select("-password");
    }

    async findUsersConitionally(field: string, value: string | number) {
        return await this.UserModel.find({ [field]: value }).select("-password");
    }

    async findUserByIdAndUpdate(id: string, payload: Record<string, any>) {
        return await this.UserModel.findByIdAndUpdate(id, payload, { new: true }).select("-password");
    }

    async getUserDetails(details: { Id: string; myId: string; }) {
        const userObjectId =  new mongoose.Types.ObjectId(details.Id)
        const user = await this.UserModel.aggregate([
            { $match: { _id: userObjectId} },
            {
                $lookup: {
                    from: DatabaseNames.friendships,
                    let: { userId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        {
                                            $and: [
                                                { $eq: ["$user1", new mongoose.Types.ObjectId(details.myId)] },
                                                { $eq: ["$user2", "$$userId"] }
                                            ]
                                        },
                                        {
                                            $and: [
                                                { $eq: ["$user1", "$$userId"] },
                                                { $eq: ["$user2", new mongoose.Types.ObjectId(details.myId)] }
                                            ]
                                        }
                                    ]
                                }
                            }
                        },
                        { $limit: 1 }
                    ],
                    as: "friendshipData"
                }
            },
            {
                $lookup: {
                    from: DatabaseNames.followers,
                    let: { userId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$myId", new mongoose.Types.ObjectId(details.myId)] },
                                        { $eq: ["$followerId", "$$userId"] }
                                    ],
                                }
                            }
                        },
                        { $limit: 1 }
                    ],
                    as: "followerData"
                }
            },
            {
                $lookup: {
                    from: DatabaseNames.followers,
                    let: { userId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$followerId", new mongoose.Types.ObjectId(details.myId)] },
                                        { $eq: ["$myId", "$$userId"] }
                                    ]
                                }
                            }
                        },
                        { $limit: 1 }
                    ],
                    as: "followingData",

                }
            },
            {
                $lookup: {
                    from: DatabaseNames.userStats,
                    localField: "_id",
                    foreignField: "userId",
                    as: "stats"
                }
            },
            {
                $unwind: {
                    path: "$stats",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    relationship: {
                        friendship: {
                            $cond: [
                                { $gt: [{ $size: "$friendshipData" }, 0] },
                                true,
                                false
                            ]
                        },
                        myFollower: {
                            $cond: [
                                { $gt: [{ $size: "$followerData" }, 0] },
                                true,
                                false
                            ]
                        },
                        myFollowing: {
                            $cond: [
                                { $gt: [{ $size: "$followingData" }, 0] },
                                true,
                                false
                            ]
                        }
                    }
                }
            },
            { $project: { friendshipData: 0, followingData: 0, followerData: 0, password: 0 } }
        ]);
        return user[0] ?? null;
    }
}
