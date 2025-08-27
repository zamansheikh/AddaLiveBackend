import mongoose from "mongoose";
import { DatabaseNames, StatusTypes, WithdrawAccountTypes } from "../../core/Utils/enums";

export interface IWithdrawBonus {
  name: string;
  hostId: string;
  agencyId: string;
  accountNumber: string;
  accountType: WithdrawAccountTypes;
  withdrawDate: Date;
  day: number;
  time: number;
  audioHour: number;
  videoHour: number;
  country: string;
  totalDiamond: number;
  totalSalary: number;
  status?: StatusTypes;
}

export interface IWithdrawBonusDocument
  extends IWithdrawBonus,
    mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IWithdrawBonusModel
  extends mongoose.Model<IWithdrawBonusDocument> {}

const WithdrawBonusSchema = new mongoose.Schema<IWithdrawBonusDocument>(
  {
    name: { type: String, required: true },
    hostId: { type: String, required: true, ref: DatabaseNames.User },
    accountNumber: { type: String, required: true },
    accountType: {
      type: String,
      required: true,
      enum: WithdrawAccountTypes,
    },
    withdrawDate: { type: Date, required: true },
    day: { type: Number, required: true },
    time: { type: Number, required: true },
    audioHour: { type: Number, required: true },
    videoHour: { type: Number, required: true },
    country: { type: String },
    totalDiamond: { type: Number, required: true },
    totalSalary: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: StatusTypes,
      default: StatusTypes.pending,
    },
    agencyId: { type: String, required: true, ref: DatabaseNames.PortalUsers },
    
  },
  { timestamps: true }
);

const WithdrawBonusModel = mongoose.model<
  IWithdrawBonusDocument,
  IWithdrawBonusModel
>(
  DatabaseNames.WithdrawBonus,
  WithdrawBonusSchema,
  DatabaseNames.WithdrawBonus
);

export default WithdrawBonusModel;
