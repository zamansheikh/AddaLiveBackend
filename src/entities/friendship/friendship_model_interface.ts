import { Document, Model, Types } from "mongoose";
import { FriendshipStatus } from "../../core/Utils/enums";

export interface IFriendship {
    user1: Types.ObjectId,
    user2: Types.ObjectId,
}

export interface IFriendshipDocument extends IFriendship, Document {
    createdAt: Date,
    updatedAt: Date,
}


export interface IFriendshipModel extends Model<IFriendshipDocument> {}