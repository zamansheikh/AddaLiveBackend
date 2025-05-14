import { IReelReactionEntity } from "../../../entities/reel_reaction_entitiy_interface";
import { IReelsReactionDocument } from "../../../models/reels/likes/reels_reaction_interface";

export interface IReelReactionRepository {
    create(ReelEntity: IReelReactionEntity): Promise<IReelsReactionDocument | null>;
    findReelById(id: string): Promise<IReelsReactionDocument | null>;
    findAllReels(): Promise<IReelsReactionDocument | null>;
    findReelsConditionally(field: string, value: string | number): Promise<IReelsReactionDocument | null>;
    findReelByIdAndUpdate(id: string, payload: Record<string, any>) : Promise<IReelsReactionDocument | null>;
}