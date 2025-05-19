import { IReelEntity } from "../../entities/reel_entity_interface";
import { IReelDocument } from "../../models/reels/reel_interface";

export interface IReelRepository {
    create(ReelEntity: IReelEntity): Promise<IReelDocument | null>;
    // ! change the return type interface
    getAllReels(query: Record<string, any>): Promise<IReelDocument[] | null>;
    findReelById(id: string): Promise<IReelDocument | null>;
    findAllReels(): Promise<IReelDocument[] | null>;
    findReelsConditionally(condition: Record<string, string | number>): Promise<IReelDocument[] | null>;
    updateCount({ reelId, count, isReaction }: { reelId: string, count: number, isReaction: boolean }): Promise<IReelDocument | string | null>;
    findReelByIdAndUpdate(id: string, payload: Record<string, any>): Promise<IReelDocument | null>;
    deleteReelById(reelId: string): Promise<IReelDocument | null>;
}