import { Document, Model } from "mongoose";
import { Types } from "mongoose";

export interface IConversation {
    roomId: string,
    senderId: Types.ObjectId,
    receiverId: Types.ObjectId,
    lastMessage: string,
    seenStatus?: boolean,
}

export interface IConversationDocument extends IConversation, Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface IConversationModel extends Model<IConversationDocument> { }