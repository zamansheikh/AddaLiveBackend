import mongoose from "mongoose";
import { IPostsReaction, IPostsReactionDocument } from "../../../entities/posts/posts_reaction_interface";
import { DatabaseNames, ReactionType } from "../../../core/Utils/enums";

const postReactionSchema = new mongoose.Schema<IPostsReactionDocument>({
    reactedBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    reactedTo: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    reaction_type: {
        type: String,
        default: ReactionType.Like,
        enum: ReactionType,
    }
}, {
    timestamps: true,
});

const PostReactions = mongoose.model(DatabaseNames.PostReactions, postReactionSchema, DatabaseNames.PostReactions);

export default PostReactions;