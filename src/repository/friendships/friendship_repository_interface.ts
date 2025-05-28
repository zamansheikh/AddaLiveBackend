import { Types } from "mongoose";
import { FriendshipStatus, RequestTypes } from "../../core/Utils/enums";
import { IFriendship, IFriendshipDocument } from "../../entities/friendship/friendship_model_interface";
import { IPagination } from "../../core/Utils/query_builder";


export interface ICondition {
    reciever: Types.ObjectId,
    sender: Types.ObjectId
}

export default interface IFriendshipRepository {
    createFriendRequest(friendship: IFriendship): Promise<IFriendshipDocument | null>;

    updateFriendRequsetStatus(id: string, status: FriendshipStatus): Promise<IFriendshipDocument | null>;

    deleteFriendship(id: string): Promise<IFriendshipDocument | null>;

    getRequestLists(userId: string, requestType: RequestTypes, query: Record<string, any>): Promise<{ pagination: IPagination, data: IFriendshipDocument[] } | null>;

    getFriendList(userId: string, query: Record<string, any>): Promise<{ pagination: IPagination, data: IFriendshipDocument[] } | null>;

    getMutalFriends(user1: string, user2: string, query: Record<string, any>): Promise<{ pagination: IPagination, data: IFriendshipDocument[] } | null>;

    getRequestConditionally(condition: ICondition): Promise<IFriendshipDocument[]>;
}