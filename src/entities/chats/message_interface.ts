import { Model, Types } from "mongoose";

export interface IMessage {
    roomId: string,
    senderId: Types.ObjectId,
    recieverId: string,
    text?: string,
    file?: string,
    seen?: boolean,
}

export interface IMessageDocument extends IMessage, Document { 
    createdAt: Date,
    updatedAt: Date,
}

export interface IMessageModel extends Model<IMessageDocument> { }