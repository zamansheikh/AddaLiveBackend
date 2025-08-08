import { DeleteResult } from "mongoose";
import { IReelReactionEntity } from "../../../entities/reel/reel_reaction_entitiy_interface";
import { IReelsReactionDocument } from "../../../models/reels/likes/reels_reaction_interface";

export interface IReelReactionRepository {
    create(ReelEntity: IReelReactionEntity): Promise<IReelsReactionDocument | null>;
    findReelReactionById(id: string): Promise<IReelsReactionDocument | null>;
    deleteUserReactions(userId: string): Promise<DeleteResult>;
    findAllReelReactions(): Promise<IReelsReactionDocument[] | null>;
    findReelReactionsConditionally(condition: Record<string, string | number> ): Promise<IReelsReactionDocument[] | null>;
    findReelReactopnByIdAndUpdate(id: string, payload: Record<string, any>) : Promise<IReelsReactionDocument | null>;
    deleteReactionByID(reelId: string): Promise<IReelsReactionDocument | null>;
}