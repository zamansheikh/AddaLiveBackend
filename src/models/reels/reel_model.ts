import mongoose from "mongoose";
import { DatabaseNames, ReelStatus } from "../../Utils/enums";
import { IReelDocument } from "./reel_interface";


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

        video_length: {
            type: Number,
            required: true,
        },

        video_maximum_length: {
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
        }

        topRank:Number
    },
    {
        timestamps: true,
    }
);

const Reels = mongoose.model(DatabaseNames.Reels, reelSchema);

export default Reels;