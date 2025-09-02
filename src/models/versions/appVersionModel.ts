import mongoose, { Document, Model } from "mongoose";

export interface IAppVersion {
    version: string,
    Release_note:string,
    DownloadURL:string,
}

export interface IAppVersionDocument extends IAppVersion, Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface IAppVersionModel extends Model<IAppVersionDocument> {};

const appVersionSchema = new mongoose.Schema<IAppVersionDocument>({
    version: {
        type: String,
        required: true,
        unique: true,
    },
    Release_note: {
        type: String,
        required: true,
    },
    DownloadURL: {
        type: String,
        required: true,
    },
}, { timestamps: true }
);
const AppVersionModel = mongoose.model<IAppVersionDocument>("AppVersion", appVersionSchema);

export default AppVersionModel;