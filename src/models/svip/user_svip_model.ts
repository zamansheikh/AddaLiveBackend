import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IUserSvip {
  userId: Types.ObjectId | string;
  /** Current SVIP tier (0 = no SVIP). */
  currentTier: number;
  /** Total coins recharged so far this calendar month. */
  monthlyRechargeCoins: number;
  /** Month (1-12) that `monthlyRechargeCoins` is tracking. */
  month: number;
  /** Year of the current tracking period. */
  year: number;
  /** The tier the user started this month with (used for retention). */
  tierStartOfMonth: number;
}

export interface IUserSvipDocument extends IUserSvip, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserSvipModel extends Model<IUserSvipDocument> {}

const UserSvipSchema = new Schema<IUserSvipDocument, IUserSvipModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: DatabaseNames.User,
      required: true,
      unique: true,
      index: true,
    },
    currentTier: { type: Number, required: true, default: 0 },
    monthlyRechargeCoins: { type: Number, required: true, default: 0 },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    tierStartOfMonth: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
    collection: DatabaseNames.UserSvip,
  },
);

const UserSvipModel = mongoose.model<IUserSvipDocument, IUserSvipModel>(
  DatabaseNames.UserSvip,
  UserSvipSchema,
  DatabaseNames.UserSvip,
);

export default UserSvipModel;
