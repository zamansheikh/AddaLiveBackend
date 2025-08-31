import mongoose from "mongoose";
import { DatabaseNames, UserRoles } from "../../core/Utils/enums";

export interface ICoinHistory {
  senderRole: UserRoles;
  senderId?: mongoose.Schema.Types.ObjectId | null | string;
  receiverRole: UserRoles;
  receiverId: mongoose.Schema.Types.ObjectId | string;
  amount: number;
  expireAt?: Date;
}

export interface ICoinHistoryDocument extends mongoose.Document, ICoinHistory {
  createdAt: Date;
  updatedAt: Date;
}

export interface ICoinHistoryModel
  extends mongoose.Model<ICoinHistoryDocument> {}

const coinHistorySchema = new mongoose.Schema<ICoinHistoryDocument>(
  {
    senderRole: {
      type: String,
      required: true,
      enum: UserRoles,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    receiverRole: {
      type: String,
      required: true,
      enum: UserRoles,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    expireAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from creation
      index: { expires: 0 }, // TTL index: expire exactly at `expireAt`
    },
  },
  { timestamps: true }
);

const CoinHistoryModel = mongoose.model<
  ICoinHistoryDocument,
  ICoinHistoryModel
>(DatabaseNames.CoinHistory, coinHistorySchema, DatabaseNames.CoinHistory);

export default CoinHistoryModel;
