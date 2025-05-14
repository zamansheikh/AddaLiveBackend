import { Document, Model } from "mongoose";


export interface IReaction {
    reaction_type: String,
    reactedTo: String,
    reactedBy: String,
}

export interface IReactionDocument extends IReaction, Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface ReactionModel extends Model<IReactionDocument> {}

