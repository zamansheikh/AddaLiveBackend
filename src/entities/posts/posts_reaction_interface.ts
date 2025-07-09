import { Document, Model } from "mongoose";


export interface IPostsReaction {
    reactionType: String,
    reactedTo: String,
    reactedBy: String,
}

export interface IPostsReactionDocument extends IPostsReaction, Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface IPostsReactionModel extends Model<IPostsReactionDocument> {}

