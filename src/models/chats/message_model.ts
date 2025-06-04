import mongoose from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";
import { IMessageDocument } from "../../entities/chats/message_interface";

const messageSchema = new mongoose.Schema<IMessageDocument>({
    roomId: {
        type: String,
        required: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: DatabaseNames.User,
        required: true,
    },
    recieverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: DatabaseNames.User,
        required: true,
    },

    deletedFor: [
        {
            userId: {type: mongoose.Schema.Types.ObjectId, ref: DatabaseNames.User},
            isActive: {
                type: Boolean,
                default: true,
            },
            deleteAt: {
                type: Date,
                default: Date.now,
            }
        }
    ],

    text: {
        type: String,
    },
    file: {
        type: String,
    },
    seen: {
        type: Boolean,
        default: false,
    },
    
}, {
    timestamps: true
});


const Messages = mongoose.model(DatabaseNames.messages, messageSchema, DatabaseNames.messages);

export default Messages;