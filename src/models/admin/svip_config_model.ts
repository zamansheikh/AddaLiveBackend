import mongoose, { Document, Model, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface ISvipTier {
  /** Tier number (1-based). */
  tier: number;
  /** Coins needed in a single month to reach this tier. */
  milestoneCoins: number;
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
