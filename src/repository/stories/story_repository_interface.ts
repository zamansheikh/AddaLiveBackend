import { DeleteResult } from "mongoose";
import { IPagination } from "../../core/Utils/query_builder";
import { IStory, IStoryDocument } from "../../entities/storeis/IStories";

export interface IStoryRepository {
    getAllStories(query: Record<string, any>): Promise<{ pagination: IPagination, data: IStoryDocument[] } | null>;
    createStory(entity: IStory): Promise<IStoryDocument | null>;
    deleteStory(id: string): Promise<IStoryDocument | null>;
    deleteUserStories(userId: string): Promise<DeleteResult>;
    updateCount(id:string, payload: Record<string, any>): Promise<IStoryDocument | null>;
    getStorybyId(id: string): Promise<IStoryDocument | null>;
}