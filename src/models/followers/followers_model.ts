import mongoose from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";
import { IFollowerDocument } from "../../entities/followers/follower_model_interface";

const followerSchema = new mongoose.Schema<IFollowerDocument>({
    myId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: DatabaseNames.User,
        required: true,
    },

    followerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: DatabaseNames.User,
        required: true,
    },
}, {
    timestamps: true,
});

followerSchema.index({ myId: 1, followerId: 1 }, { unique: true }); // prevent duplicates

const Follower = mongoose.model(DatabaseNames.followers, followerSchema, DatabaseNames.followers);

export default Follower;