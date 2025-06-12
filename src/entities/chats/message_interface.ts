import { Document, Model, Types } from "mongoose";
import { IDeletedFor } from "./conversation_interface";

export interface IMessage {
    roomId: string,
    senderId: Types.ObjectId,
    recieverId: Types.ObjectId,
    deletedFor?: IDeletedFor[]
    text?: string,
    file?: string,
    seen?: boolean,
}

export interface IMessageDocument extends IMessage, Document { 
    createdAt: Date,
    updatedAt: Date,
}

export interface IMessageModel extends Model<IMessageDocument> { }