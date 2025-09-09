import mongoose, { Document } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IBundle {
  categoryName: string;
  svgaFile: string;
}

export interface IStoreItem {
  name: string;
  validity: number;
  categoryId: mongoose.Schema.Types.ObjectId | string;
  isPremium?: boolean;
  price: number;
  svgaFile?: string;
  bundleFiles?: IBundle[];
  deleteStatus?: boolean;
  totalSold?: number;
  expireAt?: Date;
}

export interface IStoreItemDocument extends Document, IStoreItem {
  createdAt: Date;
  updatedAt: Date;
}

export interface IStoreItemModel extends mongoose.Model<IStoreItemDocument> {}

export const bundleSchema = new mongoose.Schema<IBundle>({
  categoryName: {
    type: String,
    required: true,
  },
  svgaFile: {
    type: String,
    required: true,
  },
});

const storeItemSchema = new mongoose.Schema<IStoreItemDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    validity: {
      type: Number,
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: DatabaseNames.StoreCategory,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    price: {
      type: Number,
      required: true,
    },
    svgaFile: {
      type: String,
    },
    bundleFiles: [bundleSchema],
    deleteStatus: {
      type: Boolean,
      default: false,
    },
    totalSold: {
      type: Number,
      default: 0,
    },
    expireAt: {
      type: Date,
      default: () =>  new Date(2100, 0, 1),   // deleted at year 2100 default
      index: { expires: 0 }, // expire at the date stored in expireAt
    },
  },
  { timestamps: true }
);

const StoreItemModel = mongoose.model<IStoreItemDocument>(
  DatabaseNames.StoreItem,
  storeItemSchema,
  DatabaseNames.StoreItem
);

export default StoreItemModel;
