import mongoose, { Document, Model } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IBlockedEmail {
  email: string;
}

export interface IBlockedEmailDocument extends IBlockedEmail, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IBlockedEmailModel extends Model<IBlockedEmailDocument> {}

const blockedEmailSchema = new mongoose.Schema<
  IBlockedEmailDocument,
  IBlockedEmailModel
>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);


const BlockedEmailModel = mongoose.model<
  IBlockedEmailDocument,
  IBlockedEmailModel
>(DatabaseNames.BlockedEmails, blockedEmailSchema, DatabaseNames.BlockedEmails);

export default BlockedEmailModel;