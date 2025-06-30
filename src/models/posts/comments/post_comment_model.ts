import mongoose, { Types } from "mongoose";
import { IPostComment, IPostCommentDocument } from "../../../entities/posts/posts_comments_interface";
import { DatabaseNames } from "../../../core/Utils/enums";

const postCommentSchema = new mongoose.Schema<IPostCommentDocument>({
    article: {
        type: String,
        required: true,
    },
    commentedBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    commentedTo: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    reactionsCount: {
        type: Number,
        default: 0,
    }
}, {
    timestamps: true,
});

const PostComment = mongoose.model(DatabaseNames.PostComments, postCommentSchema, DatabaseNames.PostComments);

export default PostComment;