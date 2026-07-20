import mongoose, { Document, Model, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface ISvipTier {
  /** Tier number (1-based). */
  tier: number;
  /** Coins needed in a single month to reach this tier (the recharge target). */
  milestoneCoins: number;
  /** How long the tier stays active before it must be re-earned. Default 1. */
  validityMonths: number;
  /**
   * The store item _id that visually represents this tier.
   * Set automatically when an admin creates/updates a store item
   * whose name starts with "SVIP-" followed by this tier number.
   * Null until the admin creates the corresponding store item.
   */
  storeItemId?: mongoose.Types.ObjectId | null;
}

export interface ISvipConfig {
  /** Ordered tier definitions (tier 1, 2, 3, ...). */
  tiers: ISvipTier[];
  /** Fraction of the milestone required to retain the tier each month (e.g. 0.5). */
  retentionThreshold: number;
}

export interface ISvipConfigDocument extends ISvipConfig, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface ISvipConfigModel extends Model<ISvipConfigDocument> {}

const SvipConfigSchema = new Schema<ISvipConfigDocument, ISvipConfigModel>(
  {
    tiers: {
      type: [
        {
          tier: { type: Number, required: true },
          milestoneCoins: { type: Number, required: true },
          validityMonths: { type: Number, required: true, default: 1 },
          storeItemId: {
            type: Schema.Types.ObjectId,
            ref: DatabaseNames.StoreItem,
            default: null,
          },
        },
      ],
      required: true,
    },
    retentionThreshold: {
      type: Number,
      required: true,
      default: 0.5,
    },
  },
  {
    timestamps: true,
    collection: DatabaseNames.SvipConfig,
  },
);

const SvipConfigModel = mongoose.model<ISvipConfigDocument, ISvipConfigModel>(
  DatabaseNames.SvipConfig,
  SvipConfigSchema,
  DatabaseNames.SvipConfig,
);

export default SvipConfigModel;
