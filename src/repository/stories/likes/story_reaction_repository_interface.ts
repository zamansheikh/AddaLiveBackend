import { DeleteResult } from "mongoose";
import { IStoryReaction, IStoryReactionDocument } from "../../../entities/storeis/story_reaction_interface";


export interface IStoryReactionRepository {
    create(entity: IStoryReaction): Promise<IStoryReactionDocument | null>;
    delete(id: string): Promise<IStoryReactionDocument | null>;
    deleteUserReactions(userId: string): Promise<DeleteResult>;
    findConditionally(condition: Record<string, any>): Promise<IStoryReactionDocument[] | null>;
    findAndUpdate(id: string,  payload: Record<string, any>): Promise<IStoryReactionDocument | null>;
    findById(id: string): Promise<IStoryReactionDocument | null>;
}   