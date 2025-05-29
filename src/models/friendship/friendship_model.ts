import mongoose from "mongoose";
import { IFriendshipDocument } from "../../entities/friendship/friendship_model_interface";
import { DatabaseNames, FriendshipStatus } from "../../core/Utils/enums";

const friendshipSchema = new mongoose.Schema<IFriendshipDocument>({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    reciever: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    status: {
        type: String,
        enum: FriendshipStatus,
        default: FriendshipStatus.pending
    }
},
    {
        timestamps: true,
    }
);

const Friendship = mongoose.model(DatabaseNames.friendships, friendshipSchema, DatabaseNames.friendships);

export default Friendship;