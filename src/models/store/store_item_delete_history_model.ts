import mongoose, { Document, Model, mongo } from "mongoose";
import { bundleSchema, IBundle } from "./store_item_model";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IStoreItemDeleteHistory {
  itemName: string;
  svgaFile?: string;
  bundleFiles?: IBundle[];
  showFrom: Date;
}

export interface IStoreItemDeleteHistoryDocument
  extends Document,
    IStoreItemDeleteHistory {
  createdAt: Date;
  updatedAt: Date;
}

export interface IStoreItemDeleteHistoryModel
  extends Model<IStoreItemDeleteHistoryDocument> {}

const storeItemDeleteHistorySchema = new mongoose.Schema<
  IStoreItemDeleteHistoryDocument,
  IStoreItemDeleteHistoryModel
>(
  {
    itemName: {
      type: String,
      required: true,
    },
    svgaFile: {
      type: String,
    },
    bundleFiles: [bundleSchema],
    showFrom: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

const StoreItemDeleteHistoryModel = mongoose.model<
  IStoreItemDeleteHistoryDocument,
  IStoreItemDeleteHistoryModel
>(
  DatabaseNames.StoreItemDeleteHistory,
  storeItemDeleteHistorySchema,
  DatabaseNames.StoreItemDeleteHistory
);

export default StoreItemDeleteHistoryModel;

