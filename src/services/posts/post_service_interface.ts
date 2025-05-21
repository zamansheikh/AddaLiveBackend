import { IPagination } from "../../core/Utils/query_builder";
import { IPostDocument } from "../../entities/posts/post_interface";
import { IPostCommentDocument } from "../../entities/posts/posts_comments_interface";
import { IPostsReactionDocument } from "../../entities/posts/posts_reaction_interface";

export interface IPostService {
    
    createPost({ ownerId, body, file }: { ownerId: string, body: Partial<Record<string, any>>, file?: Express.Multer.File }): Promise<IPostDocument | null>;
    getAllPost(query: Record<string, any>): Promise<{pagination: IPagination, data: IPostDocument[]} | null >; 
    editPost({ postID, postCaption, userId }: { postID: string, postCaption: string, userId: string }): Promise<IPostDocument  | null>;
    deletePost({ postID, userId }: { postID: string, userId: string }): Promise<IPostDocument  | null>;
    reactOnPosts({ postId, reaction_type, userID }: { postId: string, reaction_type: string, userID: string }): Promise<IPostDocument | IPostsReactionDocument  | null>;
    commnetOnPosts({ postId, commentText, userID }: { postId: string, commentText: string, userID: string }): Promise<IPostDocument | IPostCommentDocument  | null>;
    deleteComment({ userId, commentId, postId }: { userId: string, commentId: string, postId: string }): Promise<IPostDocument | IPostCommentDocument  | null>;
    editComment({ userId, commentId, newComment }: { userId: string, commentId: string, newComment: string }): Promise<IPostDocument | IPostCommentDocument  | null>;
    reactOnComment({ userId, commentId, reaction_type }: { userId: string, commentId: string, reaction_type: string }): Promise<IPostCommentDocument | IPostsReactionDocument  | null>;
    replyToComment({ userId, commentId, commentText, postId }: { userId: string, commentId: string, commentText: string, postId: string }): Promise<IPostCommentDocument  | null>;
    getAllComments({userId, postId, query}: {userId: string, postId: string, query: Record<string, any>}) : Promise<{pagination: IPagination, data: IPostCommentDocument[]}  | null >;
}
