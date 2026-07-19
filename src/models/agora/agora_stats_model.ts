import mongoose, { Document, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export type AgoraRequestType = "rtc" | "rtm" | "admin";

export interface IAgoraRequestHistoryItem {
  type: AgoraRequestType;
  timestamp: Date;
}

export interface IAgoraStats {
  totalRequests: number;
  rtcRequests: number;
  rtmRequests: number;
  adminRequests: number;
  lastReset: Date;
  requestHistory: IAgoraRequestHistoryItem[];
}

export interface IAgoraStatsDocument extends Document, IAgoraStats {
  createdAt: Date;
  updatedAt: Date;
}

export interface IAgoraStatsModel extends mongoose.Model<IAgoraStatsDocument> {}

const agoraRequestHistorySchema = new Schema<IAgoraRequestHistoryItem>(
  {
    type: {
      type: String,
      enum: ["rtc", "rtm", "admin"],
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const agoraStatsSchema = new Schema<IAgoraStatsDocument>(
  {
    totalRequests: { type: Number, required: true, default: 0 },
    rtcRequests: { type: Number, required: true, default: 0 },
    rtmRequests: { type: Number, required: true, default: 0 },
    adminRequests: { type: Number, required: true, default: 0 },
    lastReset: { type: Date, required: true, default: () => new Date() },
    requestHistory: {
      type: [agoraRequestHistorySchema],
      required: true,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const AgoraStatsModel = mongoose.model<IAgoraStatsDocument, IAgoraStatsModel>(
  DatabaseNames.AgoraStats,
  agoraStatsSchema,
  DatabaseNames.AgoraStats
);

export default AgoraStatsModel;
