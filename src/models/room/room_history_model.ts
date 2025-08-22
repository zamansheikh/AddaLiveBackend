import mongoose from "mongoose";
import { DatabaseNames, StreamType } from "../../core/Utils/enums";
import { StreamState } from "http2";

export interface IRoomHistory {
  host: mongoose.Schema.Types.ObjectId | string;
  totalLive: number;
  firstEligible: boolean;
  isDone?: boolean;
  type?: StreamType; 
}

export interface IRoomHistoryDocument extends IRoomHistory, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoomHistoryModel
  extends mongoose.Model<IRoomHistoryDocument> {}

const roomHistorySchema = new mongoose.Schema<IRoomHistoryDocument>(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: DatabaseNames.User,
      required: true,
    },
    totalLive: { type: Number, required: true },
    firstEligible: { type: Boolean, default: false },
    isDone: {type: Boolean, default: false},
    type: {type: String, enum: StreamType, default: StreamType.Audio}
  },
  { timestamps: true }
);

const RoomHistory = mongoose.model<IRoomHistoryDocument, IRoomHistoryModel>(
  DatabaseNames.RoomHistory,
  roomHistorySchema,
  DatabaseNames.RoomHistory
);
const WithdrawRoomHistory = mongoose.model<IRoomHistoryDocument, IRoomHistoryModel>(
  DatabaseNames.withdrawRoomHistory,
  roomHistorySchema,
  DatabaseNames.withdrawRoomHistory,
);

export { WithdrawRoomHistory };

export default RoomHistory;
