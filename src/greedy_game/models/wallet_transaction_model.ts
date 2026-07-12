import mongoose, { Document, Model, Types } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export type TransactionDirection = "debit" | "credit";

export interface IWalletTransaction {
  userId: Types.ObjectId | string;
  currency: string;
  amount: number;
  type: string;
  idempotencyKey: string;
  /** "debit" | "credit" — which way the coins moved. */
  direction?: TransactionDirection;
  /** The player's balance in `currency` immediately after this row committed.
   *  The games admin history shows it verbatim rather than walking backwards
   *  from the current balance. */
  balanceAfter?: number;
  description?: string;
  refType?: string;
  refId?: string;
}

export interface IWalletTransactionDocument extends IWalletTransaction, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IWalletTransactionModel extends Model<IWalletTransactionDocument> {}

const walletTransactionSchema = new mongoose.Schema<IWalletTransactionDocument, IWalletTransactionModel>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: DatabaseNames.User,
      required: true,
      index: true,
    },
    currency: {
      type: String,
      required: true,
      enum: ["coins", "diamonds"],
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    type: {
      type: String,
      required: true,
      enum: ["game_bet", "game_payout", "refund"],
    },
    // The ONLY thing standing between a retried request and a double charge.
    // The service's findOne pre-check loses the race; this index does not.
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
    },
    direction: {
      type: String,
      enum: ["debit", "credit"],
    },
    balanceAfter: {
      type: Number,
    },
    // Optional in the provider contract — the games backend sends them for bets,
    // payouts and refunds, but must not be rejected if it ever omits one.
    description: {
      type: String,
    },
    refType: {
      type: String,
    },
    refId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const WalletTransactionModel = mongoose.model<IWalletTransactionDocument, IWalletTransactionModel>(
  DatabaseNames.WalletTransaction,
  walletTransactionSchema,
  DatabaseNames.WalletTransaction,
);

export default WalletTransactionModel;
