import mongoose from "mongoose";


export interface ISalary {
    diamondCount: number;
    moneyCount: number;
    country: string;
}

export interface ISalaryDocument extends ISalary, mongoose.Document { 
    createdAt: Date;
    updatedAt: Date;
}

export interface ISalaryModel extends mongoose.Model<ISalaryDocument> {}

