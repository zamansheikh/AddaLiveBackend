import mongoose from "mongoose";
import { StreamType } from "../../core/Utils/enums";


export interface ISalary {
    diamondCount: number;
    moneyCount: number;
    country: string;
    type?: StreamType;
}

export interface ISalaryDocument extends ISalary, mongoose.Document { 
    createdAt: Date;
    updatedAt: Date;
}

export interface ISalaryModel extends mongoose.Model<ISalaryDocument> {}

