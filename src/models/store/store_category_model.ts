import mongoose, { Document, Model } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IStoreCategory {
  title: string;
  isPremium?: boolean;
}

export interface IStoreCategoryDocument extends Document, IStoreCategory {
  createdAt: Date;
  updatedAt: Date;
}

export interface IStoreCategoryModel extends Model<IStoreCategoryDocument> {}

const storeCategorySchema = new mongoose.Schema<
  IStoreCategoryDocument,
  IStoreCategoryModel
>(
  {
    title: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const StoreCategoryModel = mongoose.model<
  IStoreCategoryDocument,
  IStoreCategoryModel
>(
  DatabaseNames.StoreCategory,
  storeCategorySchema,
  DatabaseNames.StoreCategory
);

export default StoreCategoryModel;
