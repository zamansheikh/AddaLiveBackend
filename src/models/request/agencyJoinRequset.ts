import mongoose, { Model } from "mongoose";
import { DatabaseNames, StatusTypes } from "../../core/Utils/enums";

export interface IAgencyJoinRequest {
  agencyId: string | mongoose.Schema.Types.ObjectId;
  userId: string | mongoose.Schema.Types.ObjectId;
  status?: StatusTypes;
}

export interface IAgencyJoinRequestDocument
  extends IAgencyJoinRequest,
    mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IAgencyJoinRequestModel
  extends Model<IAgencyJoinRequestDocument> {}

const AgencyRequestSchema = new mongoose.Schema<IAgencyJoinRequestDocument>(
  {
    agencyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: DatabaseNames.PortalUsers,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: DatabaseNames.User,
    },
    status: {
      type: String,
      enum: StatusTypes,
      default: StatusTypes.pending,
    },
  },
  {
    timestamps: true,
  }
);

const AgencyJoinRequestModel = mongoose.model<
  IAgencyJoinRequestDocument,
  IAgencyJoinRequestModel
>(
  DatabaseNames.AgencyJoinRequest,
  AgencyRequestSchema,
  DatabaseNames.AgencyJoinRequest
);

export default AgencyJoinRequestModel;
