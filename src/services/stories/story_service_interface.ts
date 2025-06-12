import { IPagination } from "../../core/Utils/query_builder";
import { IStoryDocument } from "../../entities/storeis/IStories";
import { IStoryReaction, IStoryReactionDocument } from "../../entities/storeis/story_reaction_interface";


export interface IStoryService {
    createStory({ id, file }: { id: string, file: Express.Multer.File }): Promise<IStoryDocument | null>;
    deleteStory({ userId, storyId }: { userId: string, storyId: string }): Promise<IStoryDocument | null>;
    likeOnStory({ reaction_type, storyId, userId }: { reaction_type: string, userId: string, storyId: string }): Promise<IStoryDocument | IStoryReactionDocument | null>;
    getAllStory(query: Record<string, any>): Promise<{pagination: IPagination, data: IStoryDocument[]} | null>;
}