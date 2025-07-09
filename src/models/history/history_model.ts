import mongoose from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";
import { IHistoryDocument } from "../../entities/history/history_interface";

const historySchema = new mongoose.Schema<IHistoryDocument>({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    gold: {
        type: Number,
        required: true,
    },
    diamond: {
        type: Number,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
},
    { timestamps: true }
);

const History = mongoose.model(DatabaseNames.history, historySchema, DatabaseNames.history);

export default History;