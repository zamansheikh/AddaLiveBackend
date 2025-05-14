import { Document, Model } from "mongoose";


export interface IReelsReaction {
    reaction_type: String,
    reactedTo: String,
    reactedBy: String,
}

export interface IReelsReactionDocument extends IReelsReaction, Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface IReelReactionModel extends Model<IReelsReactionDocument> {}

