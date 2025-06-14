import { Document, Model, Types } from "mongoose";
import { FriendshipStatus } from "../../core/Utils/enums";

export interface IFriendship {
    sender: Types.ObjectId,
    reciever: Types.ObjectId,
    status?: FriendshipStatus,
}

export interface IFriendshipDocument extends IFriendship, Document {
    createdAt: Date,
    updatedAt: Date,
}


export interface IFriendshipModel extends Model<IFriendshipDocument> {}