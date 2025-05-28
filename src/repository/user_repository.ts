import mongoose, { mongo } from "mongoose";
import { IUserEntity } from "../entities/user_entity_interface";
import { IUserModel } from "../models/user/user_model_interface";
import { IUserRepository } from "./user_repository_interface";
import { DatabaseNames } from "../core/Utils/enums";

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
        return await this.UserModel.findById(id);
    }

    async findByUID(uid: string) {
        return await this.UserModel.findOne({ uid });
    }

    async findAllUser() {
        return await this.UserModel.find();
    }

    async findUsersConitionally(field: string, value: string | number) {
        return await this.UserModel.find({ [field]: value });
    }

    async findUserByIdAndUpdate(id: string, payload: Record<string, any>) {
        return await this.UserModel.findByIdAndUpdate(id, payload, { new: true });
    }

    async getUserDetails(details: { userId: string; myId: string; }) {
        console.log(details);
        const user = await this.UserModel.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(details.userId) } },
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
                                                { $eq: ["$sender", new mongoose.Types.ObjectId(details.myId)] },
                                                { $eq: ["$reciever", "$$userId"] }
                                            ]
                                        },
                                        {
                                            $and: [
                                                { $eq: ["$sender", "$$userId"] },
                                                { $eq: ["$reciever", new mongoose.Types.ObjectId(details.myId)] }
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
                $addFields: {
                    friendship: {
                        $cond: [
                            { $gt: [{ $size: "$friendshipData" }, 0] },
                            {
                                $let: {
                                    vars: { f: { $arrayElemAt: ["$friendshipData", 0] } },
                                    in: {
                                        status: "$$f.status",
                                        isSender: {
                                            $cond: [{ $eq: ["$$f.sender", new mongoose.Types.ObjectId(details.myId)] }, true, false]
                                        }
                                    }
                                }
                            },
                            null
                        ]
                    }
                }
            },
            { $project: { friendshipData: 0 } }
        ]);
        return user[0] ?? null;
    }
}

