import { IPagination, QueryBuilder } from "../../core/Utils/query_builder";
import { IStory, IStoryDocument, IStoryModel } from "../../entities/storeis/IStories";
import { IStoryReaction, IStoryReactionModel } from "../../entities/storeis/story_reaction_interface";
import StoryReaction from "../../models/stories/likes/story_reaction_model";
import { IStoryRepository } from "./story_repository_interface";

class StoriesRepository implements IStoryRepository {

    StoryModel: IStoryModel;
    constructor(storyModel: IStoryModel) {
        this.StoryModel = storyModel;
    }

    async createStory(entity: IStory): Promise<IStoryDocument | null> {
        const story = new this.StoryModel(entity);
        return await story.save();
    }

    async getStorybyId(id: string): Promise<IStoryDocument | null> {
        return await this.StoryModel.findById(id);
    }

    async updateCount(id: string, payload: Record<string, any>): Promise<IStoryDocument | null> {
        return await this.StoryModel.findByIdAndUpdate(id, { $inc: payload }, { new: true });
    }

    async deleteStory(id: string): Promise<IStoryDocument | null> {
        return await this.StoryModel.findByIdAndDelete(id);
    }

    async getAllStories(query: Record<string, any>): Promise<{ pagination: IPagination, data: IStoryDocument[] } | null> {
        const qb = new QueryBuilder(this.StoryModel, query);
        const res = qb.sort().paginate();

        const pagination = await res.countTotal();
        const data = await res.exec();

        return {
            pagination,
            data
        }

    }
}

export default StoriesRepository;