import mongoose, { Document } from "mongoose";

export interface IHistory {
    userId: mongoose.Schema.Types.ObjectId | string,
    gold: number,
    diamond: number,
    total_amount: number,
}

export interface IHistoryDocument extends Document, IHistory {
    createdAt: Date;
    updatedAt: Date;
}

export interface IHistoryModel extends mongoose.Model<IHistoryDocument> { }