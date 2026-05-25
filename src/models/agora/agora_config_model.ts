import mongoose, { Document, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IAgoraConfig {
  appId: string;
  appCertificate: string;
  defaultChannel: string;
  defaultUid: number;
  defaultRole: string;
  tokenExpiry: number;
}

export interface IAgoraConfigDocument extends Document, IAgoraConfig {
  createdAt: Date;
  updatedAt: Date;
}

export interface IAgoraConfigModel extends mongoose.Model<IAgoraConfigDocument> {}

const agoraConfigSchema = new Schema<IAgoraConfigDocument>(
  {
    appId: {
      type: String,
      required: true,
      trim: true,
    },
    appCertificate: {
      type: String,
      required: true,
      trim: true,
    },
    defaultChannel: {
      type: String,
      required: true,
      trim: true,
    },
    defaultUid: {
      type: Number,
      required: true,
    },
    defaultRole: {
      type: String,
      required: true,
      trim: true,
    },
    tokenExpiry: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const AgoraConfigModel = mongoose.model<IAgoraConfigDocument, IAgoraConfigModel>(
  DatabaseNames.AgoraConfig,
  agoraConfigSchema,
  DatabaseNames.AgoraConfig
);

export default AgoraConfigModel;
