// this model is to store the documents to choose the package to buy coins with diamonds
// buy coin, pay price with diamond

import mongoose, { Document, Model } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IDIamondExchange {
  coinAmount: number;
  diamondCost: number;
}

export interface IDIamondExchangeDocument extends IDIamondExchange, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IDIamondExchangeModel extends Model<IDIamondExchangeDocument> {}

const diamondExchangeSchema = new mongoose.Schema<IDIamondExchangeDocument>(
  {
    coinAmount: {
      type: Number,
      required: true,
    },
    diamondCost: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);



const DiamondEchangeModel = mongoose.model<IDIamondExchangeDocument, IDIamondExchangeModel>(
  DatabaseNames.DiamondExchange,
  diamondExchangeSchema,
  DatabaseNames.DiamondExchange,
);

export default DiamondEchangeModel