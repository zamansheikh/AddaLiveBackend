import mongoose from "mongoose";
import { DatabaseNames, ReactionType } from "../../../Utils/enums";
import { IReelsReactionDocument } from "./reels_reaction_interface";

const reelsReactionSchema = new mongoose.Schema<IReelsReactionDocument>({
    reactedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: DatabaseNames.User,
        required: true,
    },
    reactedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: DatabaseNames.Reels,
        required: true,
    },

    reaction_type: {
        type: String,
        enum: Object.values(ReactionType),
        default: ReactionType.Like,
    }

},
    {
        timestamps: true,
    }
);

const ReelsReactions = mongoose.model(DatabaseNames.ReelsReactions, reelsReactionSchema);

export default ReelsReactions;