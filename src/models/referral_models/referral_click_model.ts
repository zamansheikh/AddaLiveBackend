import mongoose, { Document, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IReferralClick {
  referrerId: mongoose.Schema.Types.ObjectId | string;
  inviteCode: string;
  ipAddress?: string;
  userAgent?: string;
  clickedAt: Date;
  isConverted: boolean; // True when a user registers with this IP/context
}

export interface IReferralClickDocument extends Document, IReferralClick {
  createdAt: Date;
  updatedAt: Date;
}

const referralClickSchema = new Schema<IReferralClickDocument>(
  {
    referrerId: {
      type: Schema.Types.ObjectId,
      ref: DatabaseNames.User,
      required: true,
      index: true,
    },
    inviteCode: {
      type: String,
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      index: true,
    },
    userAgent: {
      type: String,
    },
    isConverted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// We should probably expire these after a certain time to keep the DB clean
// For example, 7 days. If they don't install in 7 days, the click is stale.
referralClickSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

const ReferralClickModel = mongoose.model<IReferralClickDocument>(
  DatabaseNames.ReferralClick,
  referralClickSchema,
  DatabaseNames.ReferralClick
);

export default ReferralClickModel;
