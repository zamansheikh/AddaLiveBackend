import { IReelCommentEntity } from "../../../entities/reel_comment_entity_interface";
import { IReelsCommentDocument } from "../../../models/reels/comments/reels_comment_interface";


export interface IReelCommentRepository {
    create(ReelEntity: IReelCommentEntity): Promise<IReelsCommentDocument | null>;
    findReelById(id: string): Promise<IReelsCommentDocument | null>;
    findAllReels(): Promise<IReelsCommentDocument | null>;
    findReelsConditionally(field: string, value: string | number): Promise<IReelsCommentDocument | null>;
    findReelByIdAndUpdate(id: string, payload: Record<string, any>) : Promise<IReelsCommentDocument | null>;
}