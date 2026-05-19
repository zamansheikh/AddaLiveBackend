import mongoose, { Document, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IExchangeOption {
  coinsRequired: number;
  diamondsAwarded: number;
  bonusDiamonds: number;
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
    coinsRequired: {
      type: Number,
      required: true,
    },
    diamondsAwarded: {
      type: Number,
      required: true,
    },
    bonusDiamonds: {
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
