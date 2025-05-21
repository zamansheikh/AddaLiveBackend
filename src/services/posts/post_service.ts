import { IPagination } from "../../core/Utils/query_builder";
import { IPostDocument } from "../../entities/posts/post_interface";
import { IPostCommentDocument } from "../../entities/posts/posts_comments_interface";
import { IPostsReactionDocument } from "../../entities/posts/posts_reaction_interface";
import { IPostCommentRepository } from "../../repository/posts/comments/post_commnet_repository_interface";
import { IPostReactionRepository } from "../../repository/posts/likes/post_reaction_repository_interface";
import { IPostRepository } from "../../repository/posts/post_repository_interface";
import { IPostService } from "./post_service_interface";

export default class PostService implements IPostService {

    PostRepository: IPostRepository;
    ReactionRepository: IPostReactionRepository;
    CommentRepository: IPostCommentRepository;
    CommentReactionRepository: IPostReactionRepository;

    constructor(PostRepository: IPostRepository, ReactionRepository: IPostReactionRepository, CommentRepository: IPostCommentRepository, CommnetReactionRepository: IPostReactionRepository) {
        this.PostRepository = PostRepository;
        this.ReactionRepository = ReactionRepository;
        this.CommentRepository = CommentRepository;
        this.CommentReactionRepository = CommnetReactionRepository;
    }

    async createPost({ ownerId, body, file }: { ownerId: string; body: Partial<Record<string, any>>; file?: Express.Multer.File; }): Promise<IPostDocument | null> {
        // Todo: Implement later
        return null
    }

    async getAllPost(query: Record<string, any>): Promise<{ pagination: IPagination; data: IPostDocument[]; } | null> {

        return this.PostRepository.getAllPosts(query);
    }

    async editPost({ postID, reelCaption, userId }: { postID: string; reelCaption: string; userId: string; }): Promise<IPostDocument | null> {

        return null;
    }

    async deletePost({ postID, userId }: { postID: string; userId: string; }): Promise<IPostDocument | null> {
        return null;
    }

    async reactOnPosts({ reelId, reaction_type, userID }: { reelId: string; reaction_type: string; userID: string; }): Promise<IPostDocument | IPostsReactionDocument | null> {
        return null;
    }

    async commnetOnPosts({ reelId, commentText, userID }: { reelId: string; commentText: string; userID: string; }): Promise<IPostDocument | IPostCommentDocument | null> {
        return null;
    }

    async deleteComment({ userId, commentId, reelId }: { userId: string; commentId: string; reelId: string; }): Promise<IPostDocument | IPostCommentDocument | null> {
        return null;
    }

    async editComment({ userId, commentId, newComment }: { userId: string; commentId: string; newComment: string; }): Promise<IPostDocument | IPostCommentDocument | null> {
        return null;
    }

    async reactOnComment({ userId, commentId, reaction_type }: { userId: string; commentId: string; reaction_type: string; }): Promise<IPostCommentDocument | IPostsReactionDocument | null> {
        return null;
    }

    async replyToComment({ userId, commentId, commentText, reelId }: { userId: string; commentId: string; commentText: string; reelId: string; }): Promise<IPostCommentDocument | null> {
        return null;
    }

    async getAllComments({ userId, reelId, query }: { userId: string; reelId: string; query: Record<string, any>; }): Promise<{ pagination: IPagination; data: IPostCommentDocument[]; } | null> {
        return null;
    }


}