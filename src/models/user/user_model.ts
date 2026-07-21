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
    userId: { type: Number, required: true, unique: true, min: 100001 },
    premiumId: { type: Number },
    phone: { type: String, sparse: true, unique: true },
    password: { type: String },
    lastOnline: { type: Date },
    userStateInApp: {
      type: String,
      enum: UserActiveStatus,
      default: UserActiveStatus.offline,
    },
    userPermissions: [{ type: String }],
    totalBoughtCoins: { type: Number, default: 0 },
    totalEarnedXp: { type: Number, default: 0 },
    level: { type: Number, default: 0 },
    avatar: { type: String },
    currentLevelTag: { type: String },
    currentLevelBackground: { type: String },
    coverPicture: { type: String },
    name: String,
    nameUpdateDate: { type: Date },
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
    verified: { type: Boolean, default: false },
    // Per-user on/off toggles for SVIP special privileges (anti-kick etc.),
    // keyed by PrivilegeTypes value. A missing key means "enabled" — the
    // privilege still requires actually owning it via an equipped SVIP item.
    svipPrivilegeSettings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: DatabaseNames.Family,
    },
    earnedMedals: [
      {
        medalId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: DatabaseNames.Medals,
        },
        earnedAt: { type: Date, default: Date.now },
      },
    ],
    // Medals the user has chosen to display ("wear") right now. Ordered — the
    // order maps to the slots shown in the app's Current Medal section. Every
    // id here must also exist in earnedMedals (enforced on equip).
    activeMedals: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: DatabaseNames.Medals,
      },
    ],
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model(DatabaseNames.User, userSchema, DatabaseNames.User);

export default User;
