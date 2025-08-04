import mongoose, { Model } from "mongoose";

export interface IPortalUser {
  name: string;
  avatar: string;
  userId: string; //used for authentication like emails 
  password: string;
  coins: number;
  designation: string;
  parentCreator: mongoose.Schema.Types.ObjectId | string;
  diamonds: number;
  userRole: string;
  userPermissions: string[];
}

export interface IPortalUserDocument extends IPortalUser, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IPortalUserModel extends Model<IPortalUserDocument> {}
