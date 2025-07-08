import { Document, Model } from "mongoose";


export interface IAdmin {
    username: string;
    password: string;
    email: string;
    role?: string;
}

export interface IAdminDocument extends IAdmin, Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface IAdminModel extends Model<IAdminDocument> { }