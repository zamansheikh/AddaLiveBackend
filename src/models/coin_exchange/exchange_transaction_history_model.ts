import mongoose, { Document, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IExchangeTransactionHistory {
  userId: mongoose.Schema.Types.ObjectId | string;
  exchangeOptionId: mongoose.Schema.Types.ObjectId | string;
  diamondsDeducted: number;
  coinsAwarded: number;
  bonusCoins: number;
  idempotencyKey: string;
}

export interface IExchangeTransactionHistoryDocument
  extends Document, IExchangeTransactionHistory {
  createdAt: Date;
  updatedAt: Date;
}

export interface IExchangeTransactionHistoryModel extends mongoose.Model<IExchangeTransactionHistoryDocument> {}

const exchangeTransactionHistorySchema =
  new Schema<IExchangeTransactionHistoryDocument>(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: DatabaseNames.User,
        required: true,
      },
      exchangeOptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: DatabaseNames.ExchangeOption,
        required: true,
      },
      diamondsDeducted: {
        type: Number,
        required: true,
      },
      coinsAwarded: {
        type: Number,
        required: true,
      },
      bonusCoins: {
        type: Number,
        required: true,
      },
      idempotencyKey: {
        type: String,
        required: true,
        unique: true,
      },
    },
    {
      timestamps: true,
    },
  );

const ExchangeTransactionHistoryModel = mongoose.model<
  IExchangeTransactionHistoryDocument,
  IExchangeTransactionHistoryModel
>(
  DatabaseNames.ExchangeTransactionHistory,
  exchangeTransactionHistorySchema,
  DatabaseNames.ExchangeTransactionHistory,
);

export default ExchangeTransactionHistoryModel;
