import { Types } from "mongoose";
import { IFriendship, IFriendshipDocument } from "../../entities/friendship/friendship_model_interface";
import { IPagination } from "../../core/Utils/query_builder";

export default interface IFriendshipService {

    sendFriendRequest(body: IFriendship): Promise<IFriendshipDocument | null>;

    acceptFriendRequest(body: { myId: Types.ObjectId, userId: Types.ObjectId }): Promise<IFriendshipDocument | null>;

    removeFromFriend(body: { myId: Types.ObjectId, userId: Types.ObjectId }): Promise<IFriendshipDocument | null>;

    deleteFriendRequest(body: { myId: Types.ObjectId, userId: Types.ObjectId }): Promise<IFriendshipDocument | null>;

    cancelFriendRequest(body: IFriendship): Promise<IFriendshipDocument | null>;

    sentRequsetLists(userId: string, query: Record<string, any>): Promise<{pagination: IPagination, data: IFriendshipDocument[]} | null>;

    recievedRequsetLists(userId: string, query: Record<string, any>): Promise<{pagination: IPagination, data: IFriendshipDocument[]} | null>;

    myFriendLists(userId: string, query: Record<string, any>): Promise<{pagination: IPagination, data: IFriendshipDocument[]} | null>;

    othersFriendLists(userId: string, query: Record<string, any>): Promise<{pagination: IPagination, data: IFriendshipDocument[]} | null>;

    getMutualFriends(user1: string, user2: string, query: Record<string, any>): Promise<{pagination: IPagination, data: IFriendshipDocument[]} | null>;

}