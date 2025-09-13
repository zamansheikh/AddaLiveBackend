import mongoose from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";
import { IStoreItem } from "./store_item_model";

export interface IMyBucket {
  itemId: string | mongoose.Schema.Types.ObjectId | IStoreItem;
  ownerId: string | mongoose.Schema.Types.ObjectId;
  categoryId: string | mongoose.Schema.Types.ObjectId;
  expireAt?: Date;
  useStatus?: boolean;
}

export interface IMyBucketDocument extends mongoose.Document, IMyBucket {
  createdAt: Date;
  updatedAt: Date;
}

export interface IMyBucketModel extends mongoose.Model<IMyBucketDocument> {}

const myBucketSchema = new mongoose.Schema<IMyBucketDocument, IMyBucketModel>(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: DatabaseNames.StoreItem,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: DatabaseNames.User,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: DatabaseNames.StoreCategory,
    },
    useStatus: {
      type: Boolean,
      default: false,
    },
    expireAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index: expire exactly at `expireAt`
    },
  },
  { timestamps: true }
);

const MyBucketModel = mongoose.model<IMyBucketDocument, IMyBucketModel>(
  DatabaseNames.MyBucketItem,
  myBucketSchema,
  DatabaseNames.MyBucketItem
);

export default MyBucketModel;
