import mongoose from "mongoose";
import { IReelsReactionDocument } from "../../likes/reels_reaction_interface";
import { DatabaseNames, ReactionType } from "../../../../core/Utils/enums";

const reelsCoomentReactionSchema = new mongoose.Schema<IReelsReactionDocument>({
    reactedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: DatabaseNames.User,
        required: true,
    },
    reactedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: DatabaseNames.ReelsComments,
        required: true,
    },

    reactionType: {
        type: String,
        enum: Object.values(ReactionType),
        default: ReactionType.Like,
    }

},
    {
        timestamps: true,
    }
);

const ReelsCommentsReactions = mongoose.model(DatabaseNames.Reels_comment_reaction, reelsCoomentReactionSchema);

export default ReelsCommentsReactions;