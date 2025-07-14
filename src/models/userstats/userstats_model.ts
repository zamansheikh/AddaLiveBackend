import mongoose from "mongoose";
import { DatabaseNames, GiftTypes } from "../../core/Utils/enums";
import { IUSerStatsDocument } from "../../entities/userstats/userstats_interface";

const userStatsSchmea = new mongoose.Schema<IUSerStatsDocument>({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: DatabaseNames.User,
        unique: true,
        index: true
    },
    stars: {
        type: Number,
        default: 0,
    },
    coins: {
        type: Number,
        default: 0,
    },
    diamonds: {
        type: Number,
        default: 0,
    },
    levels: {
        type: Number,
        default: 0,
    },
},

    {
        timestamps: true,
    }

);

const UserStats = mongoose.model(DatabaseNames.userStats, userStatsSchmea, DatabaseNames.userStats);

export default UserStats;