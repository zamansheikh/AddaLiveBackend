import { Document, Model, Types } from "mongoose";

export interface IStory {
    ownerId: Types.ObjectId,
    mediaUrl: string,
    reactionCount?: number;
    createdAt?: Date,
}

export interface IStoryDocument extends IStory, Document {}

export interface IStoryModel extends Model<IStoryDocument>{}

