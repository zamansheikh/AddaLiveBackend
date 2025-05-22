import { Document, Model, Types } from "mongoose";

export interface IPost {
    ownerId: Types.ObjectId | string;
    postCaption?: string,
    status?: string;
    mediaUrl?: string;
    reactionCount?: number;
    commentCount?: number;
    topRank?: number;
}

export interface IPostDocument extends IPost, Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface IPostModel extends Model<IPostDocument> {}