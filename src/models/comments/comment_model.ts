import mongoose from "mongoose";
import { DatabaseNames } from "../../Utils/enums";

const commentSchema = new mongoose.Schema({
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
            ref: DatabaseNames.Reactions,
        }
    ],
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: DatabaseNames.Comments,
        }
    ]
},
    {
        timestamps: true,
    }

);

const Comment = mongoose.model(DatabaseNames.Comments, commentSchema);