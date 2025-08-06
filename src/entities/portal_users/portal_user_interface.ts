import mongoose, { Document, Model } from "mongoose";
import { ActivityZoneState } from "../../core/Utils/enums";

export interface IPortalUser {
  name: string;
  avatar: string | Express.Multer.File;
  userId: string; //used for authentication like emails
  password: string;
  coins: number;
  designation: string;
  parentCreator: mongoose.Schema.Types.ObjectId | string;
  diamonds: number;
  userRole: string;
  activityZone?: {
    zone?: ActivityZoneState;
    createdAt?: Date;
    expire?: Date;
  };
  userPermissions: string[];
}

export interface IPortalUserDocument extends IPortalUser, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IPortalUserModel extends Model<IPortalUserDocument> {}
