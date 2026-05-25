import mongoose, { Document, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface ICoinPurchaseOption {
  productId: string;
  coinAmount: number;
  bonusCoins: number;
  price: number;
  currency: string;
  isActive: boolean;
  displayOrder: number;
}

export interface ICoinPurchaseOptionDocument extends Document, ICoinPurchaseOption {
  createdAt: Date;
  updatedAt: Date;
}

export interface ICoinPurchaseOptionModel extends mongoose.Model<ICoinPurchaseOptionDocument> {}

const coinPurchaseOptionSchema = new Schema<ICoinPurchaseOptionDocument>(
  {
    productId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    coinAmount: {
      type: Number,
      required: true,
    },
    bonusCoins: {
      type: Number,
      required: true,
      default: 0,
    },
    price: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: "USD",
      trim: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    displayOrder: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const CoinPurchaseOptionModel = mongoose.model<ICoinPurchaseOptionDocument, ICoinPurchaseOptionModel>(
  DatabaseNames.CoinPurchaseOption,
  coinPurchaseOptionSchema,
  DatabaseNames.CoinPurchaseOption
);

export default CoinPurchaseOptionModel;
