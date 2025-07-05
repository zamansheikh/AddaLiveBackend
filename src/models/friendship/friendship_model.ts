import mongoose from "mongoose";
import { IFriendshipDocument } from "../../entities/friendship/friendship_model_interface";
import { DatabaseNames, FriendshipStatus } from "../../core/Utils/enums";

const friendshipSchema = new mongoose.Schema<IFriendshipDocument>({
    user1: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    user2: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
},
    {
        timestamps: true,
    }
);

const Friendship = mongoose.model(DatabaseNames.friendships, friendshipSchema, DatabaseNames.friendships);

export default Friendship;