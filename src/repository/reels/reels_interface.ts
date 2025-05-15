import { IReelEntity } from "../../entities/reel_entity_interface";
import { IReelDocument } from "../../models/reels/reel_interface";

export interface IReelRepository {
    create(ReelEntity: IReelEntity): Promise<IReelDocument | null>;
    findReelById(id: string): Promise<IReelDocument | null>;
    findAllReels(): Promise<IReelDocument[] | null>;
    findReelsConditionally(condition: Record<string, string | number>): Promise<IReelDocument[] | null>;
    findByIdAddtoSet({field, value}: {field: string, value: string}): Promise<IReelDocument | string | null>;
    findReelByIdAndUpdate(id: string, payload: Record<string, any>) : Promise<IReelDocument | null>;
}