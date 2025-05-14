import { Document, Model } from "mongoose";
import { IReaction } from "../likes/like_interface";
import { IComment } from "../comments/comment_interface";

export interface IReel {
    owenerId: string,
    pageId?: number,
    status: string,
    video_length: number,
    video_maximum_length: number,
    reelUrl: string,
    reactions: IReaction[],
    comments: IComment[],
    topRank: number,
}

export interface IReelDocument extends IReel, Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface ReelModel extends Model<IReelDocument> {}

