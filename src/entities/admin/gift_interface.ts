import { Model } from "mongoose";

export interface IGift {
    name: string;
    diamonds: number;
    coinPrice: number;
    image: string | Express.Multer.File;
}

export interface IGiftDocument extends IGift, Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface IGiftModel extends Model<IGiftDocument> { }

