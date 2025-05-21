import { IPagination } from "../../core/Utils/query_builder";
import { IPostDocument } from "../../entities/posts/post_interface";
import { IPostCommentDocument } from "../../entities/posts/posts_comments_interface";
import { IPostsReactionDocument } from "../../entities/posts/posts_reaction_interface";

export interface IPostService {
    
    createPost({ ownerId, body, file }: { ownerId: string, body: Partial<Record<string, any>>, file?: Express.Multer.File }): Promise<IPostDocument | null>;
    getAllPost(query: Record<string, any>): Promise<{pagination: IPagination, data: IPostDocument[]} | null >; 
    editPost({ postID, reelCaption, userId }: { postID: string, reelCaption: string, userId: string }): Promise<IPostDocument  | null>;
    deletePost({ postID, userId }: { postID: string, userId: string }): Promise<IPostDocument  | null>;
    reactOnPosts({ reelId, reaction_type, userID }: { reelId: string, reaction_type: string, userID: string }): Promise<IPostDocument | IPostsReactionDocument  | null>;
    commnetOnPosts({ reelId, commentText, userID }: { reelId: string, commentText: string, userID: string }): Promise<IPostDocument | IPostCommentDocument  | null>;
    deleteComment({ userId, commentId, reelId }: { userId: string, commentId: string, reelId: string }): Promise<IPostDocument | IPostCommentDocument  | null>;
    editComment({ userId, commentId, newComment }: { userId: string, commentId: string, newComment: string }): Promise<IPostDocument | IPostCommentDocument  | null>;
    reactOnComment({ userId, commentId, reaction_type }: { userId: string, commentId: string, reaction_type: string }): Promise<IPostCommentDocument | IPostsReactionDocument  | null>;
    replyToComment({ userId, commentId, commentText, reelId }: { userId: string, commentId: string, commentText: string, reelId: string }): Promise<IPostCommentDocument  | null>;
    getAllComments({userId, reelId, query}: {userId: string, reelId: string, query: Record<string, any>}) : Promise<{pagination: IPagination, data: IPostCommentDocument[]}  | null >;
}
