import { Document, Model } from "mongoose";
import { Types } from "mongoose";

<<<<<<< HEAD

export interface IDeletedFor {
 userId: Types.ObjectId,
 deleteAt: Date,
 isActive?: boolean,
}


=======
>>>>>>> 3daa7017c0d1b6a65da4bab0dbe1fda4aa7177ef
export interface IConversation {
    roomId: string,
    senderId: Types.ObjectId,
    receiverId: Types.ObjectId,
    lastMessage?: string,
    seenStatus?: boolean,
<<<<<<< HEAD
    deletedFor?: IDeletedFor[]
=======
>>>>>>> 3daa7017c0d1b6a65da4bab0dbe1fda4aa7177ef
}

export interface IConversationDocument extends IConversation, Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface IConversationModel extends Model<IConversationDocument> { }