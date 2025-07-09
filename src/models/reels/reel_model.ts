import mongoose from "mongoose";
import { IReelDocument } from "./reel_interface";
import { DatabaseNames, ReelStatus } from "../../core/Utils/enums";


const reelSchema = new mongoose.Schema<IReelDocument>(
    {
        ownerId: { // represents the creators id
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: DatabaseNames.User,
        },

        pageId: Number,

        reelCaption: String,

        status: {
            type: String,
            enum: Object.values(ReelStatus),
            default: ReelStatus.active,
        },

        videoLength: {
            type: Number,
            required: true,
        },

        videoMaximumLength: {
            type: Number,
            default: 60
        },

        reelUrl: {
            type: String,
            required: true,
        },

        reactions: {
            type: Number,
            default: 0,
        },

        comments: {
            type: Number,
            default: 0,
        },

        topRank:Number
    },
    {
        timestamps: true,
    }
);

const Reels = mongoose.model(DatabaseNames.Reels, reelSchema, DatabaseNames.Reels);

export default Reels;