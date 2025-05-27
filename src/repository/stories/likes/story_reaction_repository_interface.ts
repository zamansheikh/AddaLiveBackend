import { IStoryReaction } from "../../../entities/storeis/story_reaction_interface";


export interface IStoryReactionRepository {
    create(entity: IStoryReaction): Promise<IStoryReaction | null>;
    delete(id: string): Promise<IStoryReaction | null>;
    findConditionally(condition: Record<string, any>): Promise<IStoryReaction[] | null>;
    
    findAndUpdate(id: string,  payload: Record<string, any>): Promise<IStoryReaction | null>;
    findById(id: string): Promise<IStoryReaction | null>;
}   