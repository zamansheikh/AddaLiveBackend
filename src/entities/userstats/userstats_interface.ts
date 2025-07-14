import { Document, Model,  Types } from "mongoose";
import { GiftTypes } from "../../core/Utils/enums";

export interface IGifts {
    gift: GiftTypes,
    count: number, 
}

export interface IUserStats {
    userId: Types.ObjectId | string,
    stars?: number;
    coins?: number;
    diamonds?: number;
    levels?: number;
    gifts?: IGifts[],    
}


export interface IUSerStatsDocument extends IUserStats, Document {
    createdAt: Date;
    updatedAt: Date;
}


export interface IUSerStatsModel extends Model<IUSerStatsDocument> { }