import mongoose, { Document, Model, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IDistributedMember {
  userId: mongoose.Types.ObjectId;
  role: string;
  amount: number;
}

export interface IFamilySupportRewardHistory {
  familyId: mongoose.Types.ObjectId | string;
  weekStart: Date;
  weekEnd: Date;
  level: number;
  totalBonus: number;
  leaderCut: number;
  top1Cut: number;
  top2Cut: number;
  top3Cut: number;
  top4To10Cut: number;
  top11To15Cut: number;
  top16To20Cut: number;
  distributedMembers: IDistributedMember[];
}

export interface IFamilySupportRewardHistoryDocument
  extends IFamilySupportRewardHistory,
    Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IFamilySupportRewardHistoryModel
  extends Model<IFamilySupportRewardHistoryDocument> {}

const distributedMemberSchema = new Schema<IDistributedMember>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: DatabaseNames.User,
      required: true,
    },
    role: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false },
);

const familySupportRewardHistorySchema =
  new Schema<IFamilySupportRewardHistoryDocument>(
    {
      familyId: {
        type: Schema.Types.ObjectId,
        ref: DatabaseNames.Family,
        required: true,
        index: true,
      },
      weekStart: { type: Date, required: true },
      weekEnd: { type: Date, required: true },
      level: { type: Number, required: true },
      totalBonus: { type: Number, required: true },
      leaderCut: { type: Number, required: true },
      top1Cut: { type: Number, required: true },
      top2Cut: { type: Number, required: true },
      top3Cut: { type: Number, required: true },
      top4To10Cut: { type: Number, required: true },
      top11To15Cut: { type: Number, required: true },
      top16To20Cut: { type: Number, required: true },
      distributedMembers: [distributedMemberSchema],
    },
    { timestamps: true },
  );

familySupportRewardHistorySchema.index({ familyId: 1, weekStart: 1 });

const FamilySupportRewardHistoryModel = mongoose.model<
  IFamilySupportRewardHistoryDocument,
  IFamilySupportRewardHistoryModel
>(
  DatabaseNames.FamilySupportRewardHistory,
  familySupportRewardHistorySchema,
  DatabaseNames.FamilySupportRewardHistory,
);

export default FamilySupportRewardHistoryModel;
