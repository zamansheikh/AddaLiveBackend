import mongoose, { Document, Model } from "mongoose";
import { IUserStats } from "../../entities/userstats/userstats_interface";
import {
  ActivityZoneState,
  Gender,
  UserActiveStatus,
  UserRoles,
  WhoCanTextMe,
} from "../../core/Utils/enums";

export interface UserData {
  username: string;
  email: string;
  password?: string;
  userId: number;
  premiumId?: number;
  phone?: string;
  lastOnline?: Date;
  userStateInApp?: UserActiveStatus;
  userPermissions: string[];
  avatar?: string;
  currentLevelTag?: string;
  currentLevelBackground?: string;
  coverPicture: string;
  name?: string;
  nameUpdateDate?: Date;
  firstName?: string;
  lastName?: string;
  gender?: Gender;
  birthday?: Date;
  totalBoughtCoins: number;
  totalEarnedXp: number;
  level?: number;
  country?: string;
  whoCanTextMe?: WhoCanTextMe;
  highLevelRequirements: { levelType: string; level: number }[];
  bio?: string;
  countryCode?: string;
  countryDialCode?: string;
  uid: string;
  userRole?: UserRoles;
  countryLanguages?: string[];
  isViewer?: boolean;
  parentCreator?: mongoose.Schema.Types.ObjectId | string | null;
  objectId?: string;
  activityZone?: {
    zone?: ActivityZoneState;
    createdAt?: Date;
    expire?: Date;
  };
  stats?: IUserStats;
  verified: boolean;
  equippedStoreItems?: Record<string, any>;
  familyId?: mongoose.Schema.Types.ObjectId | string | null;
}

//  Create the document type (instance methods + fields)
export interface IUserDocument extends UserData, Document {
  createdAt: Date;
  updatedAt: Date;
}

// Create the model type (static methods like find, findOne, etc.)
export interface IUserModel extends Model<IUserDocument> {}
