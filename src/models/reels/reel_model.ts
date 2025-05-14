import mongoose from "mongoose";
import { DatabaseNames, ReelStatus } from "../../Utils/enums";

const reelSchema = new mongoose.Schema(
    {
        owenerId: { // represents the creators id
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: DatabaseNames.User,
        },

        pageId: Number,

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
            default: 59
        },

        reelUrl: {
            type: String,
            required: true,
        },

        reactions: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: DatabaseNames.Reactions
            }
        ],

        comments: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: DatabaseNames.Comments,
            },
        ],

        topRank:Number
    },
    {
        timestamps: true,
    }
);

const Reels = mongoose.model(DatabaseNames.Reels, reelSchema);

export default Reels;