import { Document, Model, Types } from "mongoose";

export interface IStoryReaction {
    reactedBy: Types.ObjectId;
    reactedTo: Types.ObjectId;
    reaction_type: string;
};

export interface IStoryReactionDocument extends IStoryReaction, Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface IStoryReactionModel extends Model<IStoryReactionDocument> {};