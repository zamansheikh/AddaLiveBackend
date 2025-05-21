import mongoose from "mongoose";
import { IPostsReaction, IPostsReactionDocument } from "../../../../entities/posts/posts_reaction_interface";
import { DatabaseNames, ReactionType } from "../../../../core/Utils/enums";

const postCommentReactionSchema = new mongoose.Schema<IPostsReactionDocument>({
    reactedBy: {
        type: String,
        required: true,
    },
    reactedTo: {
        type: String,
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

const PostCommentReaction = mongoose.model(DatabaseNames.PostCommentReactions, postCommentReactionSchema, DatabaseNames.PostCommentReactions);

export default PostCommentReaction;