import mongoose, { Document, Model, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

/**
 * Interface representing the Rocket configuration.
 * This config allows admins to control milestones and reward limits dynamically.
 */
export interface IRocketConfig {
  milestones: number[];
  rewardNumbers: number[];
  coinMin: number;
  coinMax: number;
  xpMin: number;
  xpMax: number;
}

export interface IRocketConfigDocument extends IRocketConfig, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IRocketConfigModel extends Model<IRocketConfigDocument> {}

const RocketConfigSchema = new Schema<IRocketConfigDocument, IRocketConfigModel>(
  {
    milestones: {
      type: [Number],
      required: true,
    },
    rewardNumbers: {
      type: [Number],
      required: true,
    },
    coinMin: {
      type: Number,
      required: true,
    },
    coinMax: {
      type: Number,
      required: true,
    },
    xpMin: {
      type: Number,
      required: true,
    },
    xpMax: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: DatabaseNames.RocketConfig,
  }
);

const RocketConfigModel = mongoose.model<IRocketConfigDocument, IRocketConfigModel>(
  DatabaseNames.RocketConfig,
  RocketConfigSchema,
  DatabaseNames.RocketConfig
);

export default RocketConfigModel;
