// import mongoose from "mongoose";
// import { DatabaseNames, FriendshipStatus, RequestTypes } from "../../core/Utils/enums";
// import { IPagination, QueryBuilder } from "../../core/Utils/query_builder";
// import { IFriendship, IFriendshipDocument, IFriendshipModel } from "../../entities/friendship/friendship_model_interface";
// import IFriendshipRepository, { ICondition } from "./friendship_repository_interface";
// import { friendShipUserLookUp, friendUnwind, requestListStructure } from "./friendship_constant";

// class FriendshipRepository implements IFriendshipRepository {

//     friendsModel: IFriendshipModel;

//     constructor(friendsModel: IFriendshipModel) {
//         this.friendsModel = friendsModel;
//     }


//     async createFriendRequest(friendship: IFriendship): Promise<IFriendshipDocument | null> {
//         const friendReq = new this.friendsModel(friendship);
//         return await friendReq.save();
//     }

//     async deleteFriendship(id: string): Promise<IFriendshipDocument | null> {
//         return await this.friendsModel.findByIdAndDelete(id);
//     }

//     async getFriendList(id: string, query: Record<string, any>): Promise<{ pagination: IPagination, data: IFriendshipDocument[] } | null> {
//         const userId = new mongoose.Types.ObjectId(id);
//         const qb = new QueryBuilder(this.friendsModel, query);

//         const result = qb.aggregate(
//             [
//                 {
//                     $match: {
//                         $or: [
//                             { sender: userId },
//                             { reciever: userId }, // corrected spelling
//                         ],
//                         status: FriendshipStatus.accepted
//                     }
//                 },
//                 friendShipUserLookUp("sender", "senderInfo"),
//                 friendShipUserLookUp("reciever", "recieverInfo"),
//                 friendUnwind("senderInfo"),
//                 friendUnwind("recieverInfo"),
//                 requestListStructure

//             ]
//         ).paginate();


//         const data = await result.exec();
//         const pagination = await result.countTotal();

//         return { pagination, data };
//     }

//     async getMutalFriends(user1: string, user2: string, query: Record<string, any>): Promise<{ pagination: IPagination, data: IFriendshipDocument[] } | null> {
//         const userA = new mongoose.Types.ObjectId(user1);
//         const userB = new mongoose.Types.ObjectId(user2);
        
//         const qb = new QueryBuilder(this.friendsModel, query);
//         const result = qb.aggregate([
//             {
//                 $match: {
//                     status: FriendshipStatus.accepted
//                 }
//             },

//             {
//                 $facet: {
//                     userAFriends: [
//                         {
//                             $match: {
//                                 $or: [
//                                     { sender: userA },
//                                     { reciever: userA }
//                                 ]
//                             }
//                         },
//                         {
//                             $project: {
//                                 friend: {
//                                     $cond: [
//                                         { $eq: ["$sender", userA] },
//                                         "$reciever",
//                                         "$sender"
//                                     ]
//                                 }
//                             }
//                         },
//                         {
//                             $match: {
//                                 friend: { $ne: userB }
//                             }
//                         }
//                     ],
//                     userBFriends: [
//                         {
//                             $match: {
//                                 $or: [
//                                     { sender: userB },
//                                     { reciever: userB }
//                                 ]
//                             }
//                         },
//                         {
//                             $project: {
//                                 friend: {
//                                     $cond: [
//                                         { $eq: ["$sender", userB] },
//                                         "$reciever",
//                                         "$sender"
//                                     ]
//                                 }
//                             }
//                         },
//                         {
//                             $match: {
//                                 friend: { $ne: userA }
//                             }
//                         }
//                     ]
//                 }
//             },
//             {
//                 $project: {
//                     mutualFriends: {
//                         $setIntersection: [
//                             "$userAFriends.friend",
//                             "$userBFriends.friend"
//                         ]
//                     }
//                 }
//             },
//             {
//                 $lookup: {
//                     from: DatabaseNames.User, // your actual users collection name
//                     localField: "mutualFriends",
//                     foreignField: "_id",
//                     as: "mutualFriendDetails"
//                 }
//             },
//             {
//                 $unwind: "$mutualFriends"
//             },
//             {
//                 $unwind: "$mutualFriendDetails"
//             },
//             {
//                 $group: {
//                     _id: null,
//                     mutualFriends: { $push: "$mutualFriendDetails" }
//                 }
//             }

//         ]).paginate();

//         const pagination = await result.countTotal();
//         const data = await result.exec();
//         return { pagination, data };
//     }

//     async getRequestLists(userId: string, requestType: RequestTypes, query: Record<string, any>): Promise<{ pagination: IPagination, data: IFriendshipDocument[] } | null> {
//         let condition: Record<string, any> = [];
//         console.log(userId);

//         if (requestType == RequestTypes.sent) {
//             condition = { sender: new mongoose.Types.ObjectId(userId) };
//         } else {
//             condition = { reciever: new mongoose.Types.ObjectId(userId) };
//         }

//         condition["status"] = FriendshipStatus.pending;

//         const qb = new QueryBuilder(this.friendsModel, query);

//         const result = qb.aggregate(
//             [
//                 { $match: condition },
//                 friendShipUserLookUp("sender", "senderInfo"),
//                 friendShipUserLookUp("reciever", "recieverInfo"),
//                 friendUnwind("senderInfo"),
//                 friendUnwind("recieverInfo"),
//                 requestListStructure

//             ]
//         ).paginate();

//         const data = await result.exec();
//         const pagination = await result.countTotal();

//         return { pagination, data };
//     }

//     async updateFriendRequsetStatus(id: string, status: FriendshipStatus): Promise<IFriendshipDocument | null> {
//         return await this.friendsModel.findByIdAndUpdate(id, { status }, { new: true });
//     }

//     async getRequestConditionally(condition: ICondition): Promise<IFriendshipDocument[]> {
//         const searchCondition = {
//             $or: [
//                 { sender: condition.sender, reciever: condition.reciever, },
//                 { sender: condition.reciever, reciever: condition.sender, }
//             ]
//         }
//         return await this.friendsModel.find(searchCondition);
//     }

// }

// export default FriendshipRepository;








// import { Types } from "mongoose";
// import { FriendshipStatus, RequestTypes } from "../../core/Utils/enums";
// import { IFriendship, IFriendshipDocument } from "../../entities/friendship/friendship_model_interface";
// import { IPagination } from "../../core/Utils/query_builder";


// export interface ICondition {
//     reciever: Types.ObjectId,
//     sender: Types.ObjectId
// }

// export default interface IFriendshipRepository {
//     createFriendRequest(friendship: IFriendship): Promise<IFriendshipDocument | null>;

//     updateFriendRequsetStatus(id: string, status: FriendshipStatus): Promise<IFriendshipDocument | null>;

//     deleteFriendship(id: string): Promise<IFriendshipDocument | null>;

//     getRequestLists(userId: string, requestType: RequestTypes, query: Record<string, any>): Promise<{ pagination: IPagination, data: IFriendshipDocument[] } | null>;

//     getFriendList(userId: string, query: Record<string, any>): Promise<{ pagination: IPagination, data: IFriendshipDocument[] } | null>;

//     getMutalFriends(user1: string, user2: string, query: Record<string, any>): Promise<{ pagination: IPagination, data: IFriendshipDocument[] } | null>;

//     getRequestConditionally(condition: ICondition): Promise<IFriendshipDocument[]>;
// }












// import { DatabaseNames } from "../../core/Utils/enums";

// export const requestListStructure = {
//     $project: {
//         sender: 1,
//         reciever: 1,
//         status: 1,
//         createdAt: 1,
//         updatedAt: 1,
//         senderInfo: {
//             _id: 1,
//             name: 1,
//             avatar: 1
//         },
//         recieverInfo: {
//             _id: 1,
//             name: 1,
//             avatar: 1
//         }
//     }
// }

// export const friendShipUserLookUp = (localfied: string, as: string) => {
//     return {
//         $lookup: {
//             from: DatabaseNames.User,
//             localField: localfied,
//             foreignField: "_id",
//             as: as,
//         }
//     };
// }

// export const friendUnwind = (path: string) => {
//     return {
//         $unwind: {
//             path: "$" + path,
//             preserveNullAndEmptyArrays: true
//         }
//     };
// }