import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { DatabaseNames, FamilyMemberRole } from "../../core/Utils/enums";

/**
 * Interface representing the data structure of a Family Member.
 */
export interface IFamilyMember {
  familyId: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  role: FamilyMemberRole;
  giftsReceived?: number;
}

/**
 * Interface representing the Mongoose document for a Family Member.
 */
export interface IFamilyMemberDocument extends IFamilyMember, Document {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing the Mongoose model for a Family Member.
 */
export interface IFamilyMemberModel extends Model<IFamilyMemberDocument> {}

const familyMemberSchema = new Schema<IFamilyMemberDocument>(
  {
    familyId: {
      type: Schema.Types.ObjectId,
      ref: DatabaseNames.Family,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: DatabaseNames.User,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: Object.values(FamilyMemberRole),
      default: FamilyMemberRole.Member,
    },
    giftsReceived: {
      type: Number,
      default: 0,
    }, // per-member contribution
  },
  {
    timestamps: true,
  },
);

// Define compound unique index for familyId and userId
familyMemberSchema.index({ familyId: 1, userId: 1 }, { unique: true });

const FamilyMemberModel = mongoose.model<
  IFamilyMemberDocument,
  IFamilyMemberModel
>(DatabaseNames.FamilyMember, familyMemberSchema, DatabaseNames.FamilyMember);

export default FamilyMemberModel;
