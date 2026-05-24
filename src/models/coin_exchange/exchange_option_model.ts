import mongoose, { Document, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IExchangeOption {
  diamondsRequired: number;
  coinsAwarded: number;
  bonusCoins: number;
  isActive: boolean;
  displayOrder: number;
}

export interface IExchangeOptionDocument extends Document, IExchangeOption {
  createdAt: Date;
  updatedAt: Date;
}

export interface IExchangeOptionModel extends mongoose.Model<IExchangeOptionDocument> {}

const exchangeOptionSchema = new Schema<IExchangeOptionDocument>(
  {
    diamondsRequired: {
      type: Number,
      required: true,
      unique: true,
    },
    coinsAwarded: {
      type: Number,
      required: true,
    },
    bonusCoins: {
      type: Number,
      required: true,
      default: 0,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    displayOrder: {
      type: Number,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

const ExchangeOptionModel = mongoose.model<IExchangeOptionDocument, IExchangeOptionModel>(
  DatabaseNames.ExchangeOption,
  exchangeOptionSchema,
  DatabaseNames.ExchangeOption
);

export default ExchangeOptionModel;
