import { Types } from "mongoose";
import { FriendshipStatus, RequestTypes } from "../../core/Utils/enums";
import { IFriendship, IFriendshipDocument } from "../../entities/friendship/friendship_model_interface";
import { IPagination } from "../../core/Utils/query_builder";
import { ClientSession } from "mongoose";


export interface ICondition {
    reciever: Types.ObjectId,
    sender: Types.ObjectId
}

export default interface IFriendshipRepository {
    createFriendShip(friendship: IFriendship, session?: ClientSession): Promise<IFriendshipDocument | null>;
    deleteFriendship(id: string, session?: ClientSession): Promise<IFriendshipDocument | null>;
    existingFriendship(friendship: IFriendship, session?: ClientSession): Promise<IFriendshipDocument | null>;
    getFriendShipCount(userId: string): Promise<number>;
    getFriendLists(userId: string, query: Record<string, unknown>): Promise<{pagination: IPagination, data: IFriendshipDocument[] }>
}