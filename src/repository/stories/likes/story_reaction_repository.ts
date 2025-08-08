import { IStoryReaction, IStoryReactionDocument, IStoryReactionModel } from "../../../entities/storeis/story_reaction_interface";
import { IStoryReactionRepository } from "./story_reaction_repository_interface";


export default class StoryReactionRepository implements IStoryReactionRepository {
    StoryReactionModel: IStoryReactionModel;

    constructor(reactionModel: IStoryReactionModel) {
        this.StoryReactionModel = reactionModel;
    }

    async create(entity: IStoryReaction): Promise<IStoryReactionDocument | null> {
        const storyReaction = new this.StoryReactionModel(entity);
        return await storyReaction.save();
    }

    async delete(id: string): Promise<IStoryReactionDocument | null> {
        return await this.StoryReactionModel.findByIdAndDelete(id);
    }
    
    async deleteUserReactions(userId: string) {
        return await this.StoryReactionModel.deleteMany({ reactedBy: userId });
    }
    

    async findAndUpdate(id: string, payload: Record<string, any>): Promise<IStoryReactionDocument | null> {
        return await this.StoryReactionModel.findByIdAndUpdate(id, payload);
    }

    async findById(id: string): Promise<IStoryReactionDocument | null> {
        return await this.StoryReactionModel.findById(id);
    }


    async findConditionally(condition: Record<string, any>): Promise<IStoryReactionDocument[] | null> {
        return await this.StoryReactionModel.find(condition);
    }
}