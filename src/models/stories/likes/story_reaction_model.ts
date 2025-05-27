
import mongoose from "mongoose";
import { DatabaseNames, ReactionType } from "../../../core/Utils/enums";
import { IStoryReactionDocument } from "../../../entities/storeis/story_reaction_interface";

const storyReactionSchema = new mongoose.Schema<IStoryReactionDocument>({
    reactedBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    reactedTo: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    reaction_type: {
        type: String,
        default: ReactionType.Like,
        enum: ReactionType,
    }

}, { timestamps: true });

const StoryReaction = mongoose.model(DatabaseNames.story_reactions, storyReactionSchema, DatabaseNames.story_reactions);

export default StoryReaction;