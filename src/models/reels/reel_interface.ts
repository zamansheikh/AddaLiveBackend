import { Document, Model, Types } from "mongoose";
import { IReelsReaction } from "./likes/reels_reaction_interface";
import { IReelsComment } from "./comments/reels_comment_interface";

export interface IReel {
    ownerId: Types.ObjectId | string;
    pageId?: number;
    status?: string;
    video_length: number;
    video_maximum_length?: number;
    reelUrl: string;
    reactions?: (IReelsReaction | Types.ObjectId)[];
    comments?: (IReelsComment | Types.ObjectId)[];
    topRank?: number;
}

export interface IReelDocument extends IReel, Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface IReelModel extends Model<IReelDocument> {}
