import mongoose from "mongoose";
import { DatabaseNames } from "../../../Utils/enums";

const reelsCommentSchema = new mongoose.Schema({
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
    article: {
        type: String,
        required: true,
    },
    reactions: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: DatabaseNames.ReelsReactions,
        }
    ],
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: DatabaseNames.ReelsComments,
        }
    ]
},
    {
        timestamps: true,
    }

);

const Comment = mongoose.model(DatabaseNames.ReelsComments, reelsCommentSchema);