import mongoose from "mongoose";
import { ISalaryDocument } from "./salaryModelInterface";
import { DatabaseNames } from "../../core/Utils/enums";

const salarySchema = new mongoose.Schema<ISalaryDocument>({
    diamondCount: {
        type: Number,
        required: true,
    },
    moneyCount: {
        type: Number,
        required: true,
    },
    country: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

const SalaryModel =  mongoose.model<ISalaryDocument>(DatabaseNames.Salaries, salarySchema, DatabaseNames.Salaries);

export default SalaryModel;