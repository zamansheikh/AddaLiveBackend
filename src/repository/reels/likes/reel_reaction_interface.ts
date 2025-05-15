import { IReelReactionEntity } from "../../../entities/reel_reaction_entitiy_interface";
import { IReelsReactionDocument } from "../../../models/reels/likes/reels_reaction_interface";

export interface IReelReactionRepository {
    create(ReelEntity: IReelReactionEntity): Promise<IReelsReactionDocument | null>;
    findReelReactionById(id: string): Promise<IReelsReactionDocument | null>;
    findAllReelReactions(): Promise<IReelsReactionDocument[] | null>;
    findReelReactionsConditionally(condition: Record<string, string | number> ): Promise<IReelsReactionDocument[] | null>;
    findReelReactopnByIdAndUpdate(id: string, payload: Record<string, any>) : Promise<IReelsReactionDocument | null>;
}