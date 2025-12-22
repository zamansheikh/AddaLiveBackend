import mongoose from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IUpdateCost {
    nameUpdateCost: number;
    expEquivalentCoin: number;
}

export interface IUpdateCostDocument extends IUpdateCost, mongoose.Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface IUpdateCostModel extends mongoose.Model<IUpdateCostDocument> {}

const UpdateCostSchema  = new mongoose.Schema<IUpdateCostDocument, IUpdateCostModel>({
    nameUpdateCost: {
        type: Number,
    },
    expEquivalentCoin: {
        type: Number,
    },
});

export const UpdateCostModel = mongoose.model<IUpdateCostDocument, IUpdateCostModel>(DatabaseNames.UpdateCost, UpdateCostSchema, DatabaseNames.UpdateCost);