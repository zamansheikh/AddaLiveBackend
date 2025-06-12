<<<<<<< HEAD
import { Document, Model, Types } from "mongoose";
import { IDeletedFor } from "./conversation_interface";



=======
import { Model, Types } from "mongoose";
>>>>>>> 3daa7017c0d1b6a65da4bab0dbe1fda4aa7177ef

export interface IMessage {
    roomId: string,
    senderId: Types.ObjectId,
    recieverId: Types.ObjectId,
<<<<<<< HEAD
    deletedFor?: IDeletedFor[]
=======
>>>>>>> 3daa7017c0d1b6a65da4bab0dbe1fda4aa7177ef
    text?: string,
    file?: string,
    seen?: boolean,
}

export interface IMessageDocument extends IMessage, Document { 
    createdAt: Date,
    updatedAt: Date,
}

export interface IMessageModel extends Model<IMessageDocument> { }