import mongoose from "mongoose";
import { IPost, IPostDocument } from "../../entities/posts/post_interface";
import { DatabaseNames, ReelStatus } from "../../core/Utils/enums";

const postSchema = new mongoose.Schema<IPostDocument>({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    postCaption: String,
    status: {
        type: String,
        enum: ReelStatus,
        default: ReelStatus.active,
    },
    mediaUrl: String,
    topRank: Number,
}, {
    timestamps: true, 
});

const Posts = mongoose.model(DatabaseNames.Post, postSchema, DatabaseNames.Post);

export default Posts;