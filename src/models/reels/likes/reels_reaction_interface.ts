import { Document, Model } from "mongoose";


export interface IReelsReaction {
    reactionType: String,
    reactedTo: String,
    reactedBy: String,
}

export interface IReelsReactionDocument extends IReelsReaction, Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface IReelReactionModel extends Model<IReelsReactionDocument> {}

