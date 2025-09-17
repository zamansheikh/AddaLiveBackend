import mongoose from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IRoomBonusRecords {
  userId: mongoose.Schema.Types.ObjectId | string;
  bonusDiamonds: number;
  readStatus?: boolean;
  expireAt: Date;
}

export interface IRoomBonusRecordsDocument
  extends IRoomBonusRecords,
    mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoomBonusRecordsModel
  extends mongoose.Model<IRoomBonusRecordsDocument> {}

const RoomBonusRecordsSchema = new mongoose.Schema<IRoomBonusRecordsDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: DatabaseNames.User,
      required: true,
    },
    bonusDiamonds: {
      type: Number,
      required: true,
    },
    readStatus: {
      type: Boolean,
      default: false,
    },
    expireAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  }, {
    timestamps: true,
  }
);

const RoomBonusRecordsModel = mongoose.model<
  IRoomBonusRecordsDocument,
  IRoomBonusRecordsModel
>(
  DatabaseNames.RoomBonusRecord,
  RoomBonusRecordsSchema,
  DatabaseNames.RoomBonusRecord
);

export default RoomBonusRecordsModel;
