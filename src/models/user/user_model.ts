import mongoose from "mongoose";
import { IUserDocument } from "../user/user_model_interface";
import {
  ActivityZoneState,
  DatabaseNames,
  Gender,
  UserActiveStatus,
  UserRoles,
  WhoCanTextMe,
} from "../../core/Utils/enums";

const userSchema = new mongoose.Schema<IUserDocument>(
  {
    username: { type: String, required: false },
    email: { type: String, required: true },
    password: { type: String },
    lastOnline: { type: Date },
    userStateInApp: {
      type: String,
      enum: UserActiveStatus,
      default: UserActiveStatus.offline,
    },
    userPermissions: [{ type: String }],
    totalBoughtCoins: { type: Number, default: 0 },
    level: { type: Number, default: 0 },
    avatar: { type: String },
    currentLevelTag: { type: String },
    currentLevelBackground: { type: String },
    coverPicture: { type: String },
    name: String,
    firstName: String,
    lastName: String,
    gender: { type: String, enum: Gender },
    birthday: { type: Date },
    whoCanTextMe: {
      type: String,
      enum: WhoCanTextMe,
      default: WhoCanTextMe.AllUsers,
    },
    highLevelRequirements: [
      {
        levelType: String,
        level: Number,
      },
    ],
    parentCreator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: DatabaseNames.PortalUsers,
      default: null,
    },
    country: String,
    bio: String,
    countryCode: String,
    countryDialCode: String,
    uid: { type: String, required: true, unique: true, index: true },
    userRole: {
      type: String,
      enum: UserRoles,
      default: UserRoles.User,
    },
    countryLanguages: [String],
    isViewer: { type: Boolean, default: false },
    objectId: String,
    activityZone: {
      zone: {
        type: String,
        enum: ActivityZoneState,
        default: ActivityZoneState.safe,
      },
      createdAt: { type: Date },
      expire: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model(DatabaseNames.User, userSchema, DatabaseNames.User);

export default User;
