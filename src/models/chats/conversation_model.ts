import mongoose from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";
import { IConversationDocument } from "../../entities/chats/conversation_interface";

const conversationSchema = new mongoose.Schema<IConversationDocument>({
    roomId: {
        type: String,
        required: true,
        unique: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: DatabaseNames.User,
        required: true,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: DatabaseNames.User,
        required: true,
    },
    lastMessage: {
        type: String,
        required: true,
    },

    seenStatus: {
        type: Boolean,
        default: false,
    },
    
}, {
    timestamps: true
});


const conversation = mongoose.model(DatabaseNames.conversations, conversationSchema, DatabaseNames.conversations);

export default conversation;

