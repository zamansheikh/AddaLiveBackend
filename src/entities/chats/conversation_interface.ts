import { Document, Model } from "mongoose";
import { Types } from "mongoose";


export interface IDeletedFor {
 userId: Types.ObjectId,
 deleteAt: Date,
}


export interface IConversation {
    roomId: string,
    senderId: Types.ObjectId,
    receiverId: Types.ObjectId,
    lastMessage?: string,
    seenStatus?: boolean,
    deletedFor?: IDeletedFor[]
}

export interface IConversationDocument extends IConversation, Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface IConversationModel extends Model<IConversationDocument> { }