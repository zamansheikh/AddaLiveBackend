import mongoose from "mongoose";
import { IPortalUserDocument } from "../../entities/portal_users/portal_user_interface";
import { ActivityZoneState, DatabaseNames } from "../../core/Utils/enums";

const portaLUserSchema = new mongoose.Schema<IPortalUserDocument>(
  {
    name: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    coins: {
      type: Number,
      default: 0,
    },
    designation: {
      type: String,
      required: true,
    },
    diamonds: {
      type: Number,
      default: 0,
    },
    parentCreator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: DatabaseNames.PortalUsers,
      default: null,
    },
    userPermissions: {
      type: [String],
      default: [],
    },
    activityZone: {
      zone: {
        type: String,
        enum: ActivityZoneState,
        default: ActivityZoneState.safe,
      },
      createdAt: { type: Date },
      expire: { type: Date },
  },
    userRole: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const PortalUser = mongoose.model<IPortalUserDocument>(
  DatabaseNames.PortalUsers,
  portaLUserSchema,
  DatabaseNames.PortalUsers
);

export default PortalUser;
