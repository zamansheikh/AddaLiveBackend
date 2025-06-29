import mongoose, { Document } from "mongoose";

export interface IFollower {
    myId: mongoose.Schema.Types.ObjectId | string,
    followerId: mongoose.Schema.Types.ObjectId | string,    
}

export interface IFollowerDocument extends IFollower, Document {
    createdAt: Date,
    updatedAt: Date,
}

export interface IFollowerModel extends mongoose.Model<IFollowerDocument> {}