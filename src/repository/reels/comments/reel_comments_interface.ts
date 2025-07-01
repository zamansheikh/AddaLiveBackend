import { IPagination } from "../../../core/Utils/query_builder";
import { IReelCommentEntity } from "../../../entities/reel/reel_comment_entity_interface";
import { IReelsCommentDocument } from "../../../models/reels/comments/reels_comment_interface";


export interface IReelCommentRepository {
    create(comment: IReelCommentEntity): Promise<IReelsCommentDocument | null>;
    findCommentById(commentId: string): Promise<IReelsCommentDocument | null>;
    findCommentByIdAndUpdate(commentId: string, payload:Record<string, string>): Promise<IReelsCommentDocument | null>;
    deleteCommentByID(commentId: string):Promise<IReelsCommentDocument | null>;
    getAllComments(): Promise<IReelsCommentDocument[] | null>;
    updateCount(comentId: string, payload: Record<string, number>): Promise<IReelsCommentDocument | null>;
    getCommentsWithReplies({reelId, userId, query}: {reelId: string, userId: string, query: Record<string, any>}):Promise<{pagination: IPagination, data: IReelsCommentDocument[]} | null>
}