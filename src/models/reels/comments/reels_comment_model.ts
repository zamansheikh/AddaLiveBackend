import mongoose from "mongoose";
import { DatabaseNames } from "../../../Utils/enums";
import { IReelsCommentDocument } from "./reels_comment_interface";

const reelsCommentSchema = new mongoose.Schema<IReelsCommentDocument>({
    commentedBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: DatabaseNames.User,
    },
    CommentedTo: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: DatabaseNames.Reels,
    },
    parentComment: mongoose.Schema.Types.ObjectId,
    article: {
        type: String,
        required: true,
    },
    reactionsCount: {
        type: Number,
        default: 0,
    },
},
    {
        timestamps: true,
    }

);

const Comments = mongoose.model(DatabaseNames.ReelsComments, reelsCommentSchema);

export default Comments;