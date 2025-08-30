import { Document, Model } from "mongoose";

export interface IGift {
    name: string;
    category: string;
    sendCount?: number;
    diamonds: number;
    coinPrice: number;
    previewImage: string | Express.Multer.File;
    svgaImage: string | Express.Multer.File;
}

export interface IGiftDocument extends IGift, Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface IGiftModel extends Model<IGiftDocument> { }

