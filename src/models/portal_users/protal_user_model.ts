import mongoose from "mongoose";
import { IPortalUserDocument } from "../../entities/portal_users/portal_user_interface";
import { DatabaseNames } from "../../core/Utils/enums";

const portaLUserSchema = new mongoose.Schema<IPortalUserDocument>({
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
    userRole: {
      type: String,
      required: true,
    },
}, { timestamps: true });

const PortalUser = mongoose.model<IPortalUserDocument>(DatabaseNames.PortalUsers, portaLUserSchema, DatabaseNames.PortalUsers);

export default PortalUser;