import { IReelEntity } from "../../entities/reel_entity_interface";
import { IReelDocument } from "../../models/reels/reel_interface";

export interface IReelRepository {
    create(ReelEntity: IReelEntity): Promise<IReelDocument | null>;
    findReelById(id: string): Promise<IReelDocument | null>;
    findAllReels(): Promise<IReelDocument | null>;
    findReelsConditionally(field: string, value: string | number): Promise<IReelDocument | null>;
    findReelByIdAndUpdate(id: string, payload: Record<string, any>) : Promise<IReelDocument | null>;
}