import mongoose from "mongoose";
import { IReelsCommentDocument } from "./reels_comment_interface";
import { DatabaseNames } from "../../../core/Utils/enums";

const reelsCommentSchema = new mongoose.Schema<IReelsCommentDocument>({
    commentedBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: DatabaseNames.User,
    },
    commentedTo: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: DatabaseNames.Reels,
    },
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        ref: DatabaseNames.ReelsComments
    },
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

const Comments = mongoose.model(DatabaseNames.ReelsComments, reelsCommentSchema, DatabaseNames.ReelsComments);

export default Comments;