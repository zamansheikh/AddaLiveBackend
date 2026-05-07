import mongoose, { Document } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IBundle {
  categoryName: string;
  svgaFile: string;
  previewFile: string;
  fileType: string;
}

export interface IPrices {
  validity: number;
  price: number;
}

export interface IStoreItem {
  name: string;
  logo?: string;
  background?: string;
  categoryId: mongoose.Schema.Types.ObjectId | string;
  isPremium?: boolean;
  prices: IPrices[];
  svgaFile?: string;
  previewFile?: string;
  bundleFiles?: IBundle[];
  privilege?: string[];
  deleteStatus?: boolean;
  totalSold?: number;
  expireAt?: Date;
  canUserBuyThis?: boolean;
  isBought?: boolean;
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
  // svgaFile and previewFile are each independently optional — admins may
  // upload a static-image-only bundle (svgaFile: "") or an svga-only bundle
  // (previewFile: ""). The application layer enforces that at least one of
  // the two is non-empty per bundle.
  svgaFile: {
    type: String,
    default: "",
  },
  previewFile: {
    type: String,
    default: "",
  },
  fileType: {
    type: String,
    required: true,
  },
});

export const priceSchema = new mongoose.Schema<IPrices>(
  {
    validity: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

const storeItemSchema = new mongoose.Schema<IStoreItemDocument>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    logo: {
      type: String,
    },
    background: {
      type: String,
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
    prices: [priceSchema],
    svgaFile: {
      type: String,
    },
    previewFile: {
      type: String,
    },
    bundleFiles: [bundleSchema],
    privilege: {
      type: [String],
      default: [],
    },
    deleteStatus: {
      type: Boolean,
      default: false,
    },
    totalSold: {
      type: Number,
      default: 0,
    },
    canUserBuyThis: {
      type: Boolean,
      default: true,
    },
    expireAt: {
      type: Date,
      default: () => new Date(2100, 0, 1), // deleted at year 2100 default
      index: { expires: 0 }, // expire at the date stored in expireAt
    },
  },
  { timestamps: true },
);

const StoreItemModel = mongoose.model<IStoreItemDocument>(
  DatabaseNames.StoreItem,
  storeItemSchema,
  DatabaseNames.StoreItem,
);

export default StoreItemModel;
