import mongoose from "mongoose";
import { ISalaryDocument } from "./salaryModelInterface";
import { DatabaseNames, StreamType } from "../../core/Utils/enums";
import Stream from "stream";

const salarySchema = new mongoose.Schema<ISalaryDocument>({
    diamondCount: {type: Number,
        required: true,
    },
    moneyCount: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        enum: StreamType,
        default: StreamType.Audio
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