import mongoose from "mongoose";
import {
  DatabaseNames,
  StatusTypes,
  WithdrawAccountTypes,
} from "../../core/Utils/enums";

export interface IAgencyWithdraw {
  name: string;
  accoutNumber: string;
  accountType: WithdrawAccountTypes;
  withdrawDate: Date;
  totalSalary: number;
  status: StatusTypes;
  agencyId: mongoose.Schema.Types.ObjectId | string;
  expireAt?: Date;
}

export interface IAgencyWithdrawDocument
  extends IAgencyWithdraw,
    mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IAgencyWithdrawModel
  extends mongoose.Model<IAgencyWithdrawDocument> {}

const AgencyWithdrawSchema = new mongoose.Schema<IAgencyWithdrawDocument>(
  {
    name: {
      type: String,
      required: true,
    },
    accoutNumber: {
      type: String,
      required: true,
    },
    accountType: {
      type: String,
      enum: WithdrawAccountTypes,
      required: true,
    },
    withdrawDate: {
      type: Date,
      required: true,
    },
    totalSalary: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: StatusTypes,
      default: StatusTypes.pending,
    },
    agencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: DatabaseNames.PortalUsers,
      required: true,
    },
    expireAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from creation
      index: { expires: 0 }, // TTL index: expire exactly at `expireAt`
    },
  },
  {
    timestamps: true,
  }
);

const AgencyWithdrawModel = mongoose.model<
  IAgencyWithdrawDocument,
  IAgencyWithdrawModel
>(
  DatabaseNames.AgencyWithdraw,
  AgencyWithdrawSchema,
  DatabaseNames.AgencyWithdraw
);

export default AgencyWithdrawModel;
