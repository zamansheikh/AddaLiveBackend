
import mongoose from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";
import { IStoryDocument } from "../../entities/storeis/IStories";


const storySchema = new mongoose.Schema<IStoryDocument>({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: DatabaseNames.User,
    },

    mediaUrl: {
        type: String,
        require: true,
    },

    reactionCount: {
        type: Number,
        default: 0,
    },
    
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '24h',
    }
});

const Story = mongoose.model(DatabaseNames.stories, storySchema, DatabaseNames.stories);

export default Story;