import { IPagination } from "../../../core/Utils/query_builder";
import { IPostComment, IPostCommentDocument } from "../../../entities/posts/posts_comments_interface";

export interface IPostCommentRepository {
    create(comment: IPostComment): Promise<IPostCommentDocument | null>;
    findCommentById(commentId: string): Promise<IPostCommentDocument | null>;
    findCommentByIdAndUpdate(commentId: string, payload:Record<string, string>): Promise<IPostCommentDocument | null>;
    deleteCommentByID(commentId: string):Promise<IPostCommentDocument | null>;
    getAllComments(): Promise<IPostCommentDocument[] | null>;
    updateCount(comentId: string, payload: Record<string, number>): Promise<IPostCommentDocument | null>;
    getCommentsWithReplies({postId, query}: {postId: string, query: Record<string, any>}):Promise<{pagination: IPagination, data: IPostCommentDocument[]} | null>
}