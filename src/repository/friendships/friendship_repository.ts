import mongoose from "mongoose";
import { DatabaseNames, FriendshipStatus, RequestTypes } from "../../core/Utils/enums";
import { IPagination, QueryBuilder } from "../../core/Utils/query_builder";
import { IFriendship, IFriendshipDocument, IFriendshipModel } from "../../entities/friendship/friendship_model_interface";
import IFriendshipRepository, { ICondition } from "./friendship_repository_interface";
import { friendShipUserLookUp, friendUnwind, requestListStructure } from "./friendship_constant";

class FriendshipRepository implements IFriendshipRepository {

    friendsModel: IFriendshipModel;

    constructor(friendsModel: IFriendshipModel) {
        this.friendsModel = friendsModel;
    }


    async createFriendRequest(friendship: IFriendship): Promise<IFriendshipDocument | null> {
        const friendReq = new this.friendsModel(friendship);
        return await friendReq.save();
    }

    async deleteFriendship(id: string): Promise<IFriendshipDocument | null> {
        return await this.friendsModel.findByIdAndDelete(id);
    }

    async getFriendList(id: string, query: Record<string, any>): Promise<{ pagination: IPagination, data: IFriendshipDocument[] } | null> {
        const userId = new mongoose.Types.ObjectId(id);
        const qb = new QueryBuilder(this.friendsModel, query);

        const result = qb.aggregate(
            [
                {
                    $match: {
                        $or: [
                            { sender: userId },
                            { reciever: userId }, // corrected spelling
                        ],
                        status: FriendshipStatus.accepted
                    }
                },
                friendShipUserLookUp("sender", "senderInfo"),
                friendShipUserLookUp("reciever", "recieverInfo"),
                friendUnwind("senderInfo"),
                friendUnwind("recieverInfo"),
                requestListStructure

            ]
        ).paginate();


        const data = await result.exec();
        const pagination = await result.countTotal();

        return { pagination, data };
    }

    async getMutalFriends(user1: string, user2: string, query: Record<string, any>): Promise<{ pagination: IPagination, data: IFriendshipDocument[] } | null> {
        const userA = new mongoose.Types.ObjectId(user1);
        const userB = new mongoose.Types.ObjectId(user2);


        const qb = new QueryBuilder(this.friendsModel, query);
        const result = qb.aggregate([
            {
                $match: {
                    status: FriendshipStatus.accepted
                }
            },

            {
                $facet: {
                    userAFriends: [
                        {
                            $match: {
                                $or: [
                                    { sender: userA },
                                    { reciever: userA }
                                ]
                            }
                        },
                        {
                            $project: {
                                friend: {
                                    $cond: [
                                        { $eq: ["$sender", userA] },
                                        "$reciever",
                                        "$sender"
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                friend: { $ne: userB }
                            }
                        }
                    ],
                    userBFriends: [
                        {
                            $match: {
                                $or: [
                                    { sender: userB },
                                    { reciever: userB }
                                ]
                            }
                        },
                        {
                            $project: {
                                friend: {
                                    $cond: [
                                        { $eq: ["$sender", userB] },
                                        "$reciever",
                                        "$sender"
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                friend: { $ne: userA }
                            }
                        }
                    ]
                }
            },
            {
                $project: {
                    mutualFriends: {
                        $setIntersection: [
                            "$userAFriends.friend",
                            "$userBFriends.friend"
                        ]
                    }
                }
            },
            {
                $lookup: {
                    from: DatabaseNames.User, // your actual users collection name
                    localField: "mutualFriends",
                    foreignField: "_id",
                    as: "mutualFriendDetails"
                }
            },
            {
                $unwind: "$mutualFriends"
            },
            {
                $unwind: "$mutualFriendDetails"
            },
            {
                $group: {
                    _id: null,
                    mutualFriends: { $push: "$mutualFriendDetails" }
                }
            }

        ]).paginate();

        const pagination = await result.countTotal();
        const data = await result.exec();
        return { pagination, data };
    }

    async getRequestLists(userId: string, requestType: RequestTypes, query: Record<string, any>): Promise<{ pagination: IPagination, data: IFriendshipDocument[] } | null> {
        let condition: Record<string, any> = [];
        console.log(userId);

        if (requestType == RequestTypes.sent) {
            condition = { sender: new mongoose.Types.ObjectId(userId) };
        } else {
            condition = { reciever: new mongoose.Types.ObjectId(userId) };
        }

        condition["status"] = FriendshipStatus.pending;

        const qb = new QueryBuilder(this.friendsModel, query);

        const result = qb.aggregate(
            [
                { $match: condition },
                friendShipUserLookUp("sender", "senderInfo"),
                friendShipUserLookUp("reciever", "recieverInfo"),
                friendUnwind("senderInfo"),
                friendUnwind("recieverInfo"),
                requestListStructure

            ]
        ).paginate();

        const data = await result.exec();
        const pagination = await result.countTotal();

        return { pagination, data };
    }

    async updateFriendRequsetStatus(id: string, status: FriendshipStatus): Promise<IFriendshipDocument | null> {
        return await this.friendsModel.findByIdAndUpdate(id, { status }, { new: true });
    }

    async getRequestConditionally(condition: ICondition): Promise<IFriendshipDocument[]> {
        const searchCondition = {
            $or: [
                { sender: condition.sender, reciever: condition.reciever, },
                { sender: condition.reciever, reciever: condition.sender, }
            ]
        }
        return await this.friendsModel.find(searchCondition);
    }

}

export default FriendshipRepository;