import mongoose, { Document, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IReferral {
  referrer: mongoose.Schema.Types.ObjectId | string;
  referee: mongoose.Schema.Types.ObjectId | string;
  status: "pending" | "valid" | "rejected"; 
  totalCoinsEarned: number;
  referralLevel: number; // The level of the referrer at the time of referral
  conversionClickId?: mongoose.Schema.Types.ObjectId | string; // Optional link back to the click
  verifiedAt?: Date;
}

export interface IReferralDocument extends Document, IReferral {
  createdAt: Date;
  updatedAt: Date;
}

const referralSchema = new Schema<IReferralDocument>(
  {
    referrer: {
      type: Schema.Types.ObjectId,
      ref: DatabaseNames.User,
      required: true,
      index: true,
    },
    referee: {
      type: Schema.Types.ObjectId,
      ref: DatabaseNames.User,
      required: true,
      unique: true, // One user can only be referred once
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "valid", "rejected"],
      default: "pending",
    },
    totalCoinsEarned: {
      type: Number,
      default: 0,
    },
    referralLevel: {
      type: Number,
      default: 1,
    },
    conversionClickId: {
      type: Schema.Types.ObjectId,
      ref: DatabaseNames.ReferralClick,
    },
    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const ReferralModel = mongoose.model<IReferralDocument>(
  DatabaseNames.Referral,
  referralSchema,
  DatabaseNames.Referral
);

export default ReferralModel;
