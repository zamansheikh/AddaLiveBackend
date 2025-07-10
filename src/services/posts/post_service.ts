import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IPagination } from "../../core/Utils/query_builder";
import { IPost, IPostDocument } from "../../entities/posts/post_interface";
import { IPostComment, IPostCommentDocument } from "../../entities/posts/posts_comments_interface";
import { IPostsReactionDocument } from "../../entities/posts/posts_reaction_interface";
import { IPostCommentRepository } from "../../repository/posts/comments/post_commnet_repository_interface";
import { IPostReactionRepository } from "../../repository/posts/likes/post_reaction_repository_interface";
import { IPostRepository } from "../../repository/posts/post_repository_interface";
import { IPostService } from "./post_service_interface";
import { uploadFileToCloudinary } from "../../core/Utils/upload_file_cloudinary";
import { CloudinaryFolder, ReactionType } from "../../core/Utils/enums";
import { isVideoFile } from "../../core/Utils/helper_functions";
import { Types } from "mongoose";
import { IUserRepository } from "../../repository/user_repository";

export default class PostService implements IPostService {

    PostRepository: IPostRepository;
    ReactionRepository: IPostReactionRepository;
    CommentRepository: IPostCommentRepository;
    CommentReactionRepository: IPostReactionRepository;
    UserRepository: IUserRepository;

    constructor(PostRepository: IPostRepository, ReactionRepository: IPostReactionRepository, CommentRepository: IPostCommentRepository, CommnetReactionRepository: IPostReactionRepository, UserRepository: IUserRepository) {
        this.PostRepository = PostRepository;
        this.ReactionRepository = ReactionRepository;
        this.CommentRepository = CommentRepository;
        this.CommentReactionRepository = CommnetReactionRepository;
        this.UserRepository = UserRepository;
    }

    async createPost({ ownerId, body, file }: { ownerId: string; body: Partial<Record<string, any>>; file?: Express.Multer.File; }): Promise<IPostDocument | null> {
        const user = await this.UserRepository.findUserById(ownerId);
        if (!user) throw new AppError(StatusCodes.BAD_REQUEST, "User does not exist");
        const { postCaption } = body;
        if (postCaption && postCaption.length == 0 && !file) {
            throw new AppError(StatusCodes.BAD_REQUEST, "No caption or media has been provided, at least one must be provided");
        }
        let postBody: IPost = {
            ownerId,
            postCaption,
        };

        let mediaUrl;
        if (file) {
            const isVideo = isVideoFile(file.originalname);
            if (isVideo) {
                if (file.mimetype != "video/mp4") throw new AppError(StatusCodes.BAD_REQUEST, "Only MP4 format is supported");
                mediaUrl = await uploadFileToCloudinary({ isVideo: true, folder: CloudinaryFolder.PostVideos, file });
            } else {
                // if (file.mimetype != "image/png") throw new AppError(StatusCodes.BAD_REQUEST, "Only PNG format is supported");
                mediaUrl = await uploadFileToCloudinary({ isVideo: false, folder: CloudinaryFolder.PostImages, file });
            }
            postBody["mediaUrl"] = mediaUrl;
        }
        const post = this.PostRepository.create(postBody);
        if (!post) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Something went wrong while creating the post");

        return post;
    }

    async getAllPost(query: Record<string, any>): Promise<{ pagination: IPagination; data: IPostDocument[]; } | null> {
        return this.PostRepository.getAllPosts(query);
    }

    async getPostDetails(postId: string, userId: string): Promise<IPostDocument> {
        const existingPost = await this.PostRepository.findPostById(postId);
        if(!existingPost) throw new AppError(StatusCodes.BAD_REQUEST, "Post does not exist");
        const existingUser = await this.UserRepository.findUserById(userId);
        if(!existingUser) throw new AppError(StatusCodes.BAD_REQUEST, "User does not exist");
        
        const post = await this.PostRepository.getPostDetails(postId, userId);
        if (!post) throw new AppError(StatusCodes.BAD_REQUEST, "Post not found");
        return post;
    }

    async editPost({ postID, postCaption, userId }: { postID: string; postCaption: string; userId: string; }): Promise<IPostDocument | null> {
        const post = await this.PostRepository.findPostById(postID);
        if (!post) throw new AppError(StatusCodes.BAD_REQUEST, "post was not found with the provided Id");
        if (post.ownerId.toString() != userId) throw new AppError(StatusCodes.BAD_REQUEST, "User is not authorized to edit this post");
        return this.PostRepository.findPostByIdAndUpdate(postID, { postCaption });
    }

    async deletePost({ postID, userId }: { postID: string; userId: string; }): Promise<IPostDocument | null> {
        const post = await this.PostRepository.findPostById(postID);
        if (!post) throw new AppError(StatusCodes.BAD_REQUEST, "Post not found!");
        if (post.ownerId.toString() != userId) throw new AppError(StatusCodes.BAD_REQUEST, "User is not authorized to delete this post");
        return await this.PostRepository.deletePostById(postID);
    }

    async reactOnPosts({ postId, reaction_type, userID }: { postId: string; reaction_type: string; userID: string; }): Promise<IPostDocument | IPostsReactionDocument | null> {
        if (!Object.values(ReactionType).includes(reaction_type as ReactionType)) {
            throw new AppError(StatusCodes.BAD_REQUEST, "reaction_type is of wrong type");
        }
        const post = await this.PostRepository.findPostById(postId);
        if (!post) throw new AppError(StatusCodes.BAD_REQUEST, "the post id is not valid");

        const existingReactions = await this.ReactionRepository.findPostReactionsConditionally({
            reactedTo: postId,
            reactedBy: userID,
        });

        // If reaction exists
        if (existingReactions && existingReactions.length > 0) {
            const existingReaction = existingReactions[0];
            const id = existingReaction._id;

            // Toggle off if same reaction type
            if (existingReaction.reactionType === reaction_type) {
                const delReaction = await this.ReactionRepository.deleteReactionByID(id as string);
                if (delReaction) return await this.PostRepository.updateCount(postId, { reactionCount: -1 });
                throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Something went wrong while unliking the post");
            }
            return await this.ReactionRepository.findPostReactopnByIdAndUpdate(id as string, { reaction_type });
        }
        const newReaction = await this.ReactionRepository.create({
            reactedBy: userID,
            reactedTo: postId,
            reactionType: reaction_type as ReactionType,
        });

        if (!newReaction) {
            throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "something went wrong while registering the reaction in the database");
        }

        const updatedReel = await this.PostRepository.updateCount(postId, { reactionCount: 1 });

        if (!updatedReel) {
            throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "updating the reactions failed");
        }

        return updatedReel;
    }

    async commnetOnPosts({ postId, commentText, userID }: { postId: string; commentText: string; userID: string; }): Promise<IPostDocument | IPostCommentDocument | null> {
        const reel = await this.PostRepository.findPostById(postId);
        if (!reel) throw new AppError(StatusCodes.BAD_REQUEST, "either wrong post Id, or does not exist");
        console.log(postId, commentText, userID);

        const comment = await this.CommentRepository.create({ commentedBy: new Types.ObjectId(userID), article: commentText, commentedTo: new Types.ObjectId(postId) } as IPostComment);
        if (!comment) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "failed creating comment");

        const reelComment = await this.PostRepository.updateCount(postId, { commentCount: 1 });
        if (!reelComment) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "failed incrementing comment count");
        return comment;
    }

    async deleteComment({ userId, commentId, postId }: { userId: string; commentId: string; postId: string; }): Promise<IPostDocument | IPostCommentDocument | null> {
        const comment = await this.CommentRepository.findCommentById(commentId);
        if (!comment) throw new AppError(StatusCodes.BAD_REQUEST, "Commnet does not exist");
        if (comment.commentedBy.toString() != userId) throw new AppError(StatusCodes.BAD_REQUEST, "User is not authorized to delete this comment");
        if (comment.commentedTo.toString() != postId) throw new AppError(StatusCodes.BAD_REQUEST, "this post id does not contain this comment");

        const deletedComment = await this.CommentRepository.deleteCommentByID(commentId);
        if (!deletedComment) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "deleting the comment failed");

        const reel = this.PostRepository.updateCount(postId, { commentCount: -1 });
        if (!reel) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "decrementing the reel comment count failed");

        return deletedComment;
    }

    async editComment({ userId, commentId, newComment }: { userId: string; commentId: string; newComment: string; }): Promise<IPostDocument | IPostCommentDocument | null> {
        const comment = await this.CommentRepository.findCommentById(commentId);
        if (!comment) throw new AppError(StatusCodes.BAD_REQUEST, "Comment does not exist");
        if (comment.commentedBy.toString() != userId) throw new AppError(StatusCodes.BAD_REQUEST, "User is not authorized to edit this comment");
        const updatedComment = await this.CommentRepository.findCommentByIdAndUpdate(commentId, { article: newComment })
        return updatedComment;
    }

    async reactOnComment({ userId, commentId, reaction_type }: { userId: string; commentId: string; reaction_type: string; }): Promise<IPostCommentDocument | IPostsReactionDocument | null> {
        if (!Object.values(ReactionType).includes(reaction_type as ReactionType)) {
            throw new AppError(StatusCodes.BAD_REQUEST, "Reaction_type is not of the right type");
        }

        const reaction = await this.CommentReactionRepository.findPostReactionsConditionally({ reactedTo: commentId, reactedBy: userId });

        if (reaction && reaction.length > 0) {
            const reactionID = reaction[0]._id as string;
            if (reaction[0].reactionType == reaction_type) {
                const deletedReaction = this.CommentReactionRepository.deleteReactionByID(reactionID);
                if (!deletedReaction) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "deleting the reaction failed");
                const comment = await this.CommentRepository.updateCount(commentId, { reactionsCount: -1 });
                return comment;
            }

            const updatedReaction = await this.CommentReactionRepository.findPostReactopnByIdAndUpdate(reactionID, { reaction_type });
            if (!updatedReaction) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "updating the reaction failed");
            return updatedReaction;
        }

        const reactionOnComment = await this.CommentReactionRepository.create({ reactedBy: userId, reactedTo: commentId, reactionType: reaction_type as ReactionType });
        if (!reactionOnComment) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "creation of nreaction on comment failed");
        const comment = await this.CommentRepository.updateCount(commentId, { reactionsCount: 1 });
        if (!comment) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Incrementing comment reaction count failed");
        return comment;

    }

    async replyToComment({ userId, commentId, commentText, postId }: { userId: string; commentId: string; commentText: string; postId: string; }): Promise<IPostCommentDocument | null> {

        const reel = await this.PostRepository.findPostById(postId);
        if (!reel) throw new AppError(StatusCodes.BAD_REQUEST, "either reelId is not valid or the reel does not exist");

        const comment = await this.CommentRepository.findCommentById(commentId);
        if (!comment) throw new AppError(StatusCodes.BAD_REQUEST, "either the commentId is not valid or the comment does not exist");

        if (comment.commentedTo.toString() != postId) throw new AppError(StatusCodes.BAD_REQUEST, "the comment does not belong to this reel");

        const reply = await this.CommentRepository.create({ article: commentText, commentedBy: new Types.ObjectId(userId), commentedTo: new Types.ObjectId(postId), parentComment: commentId });
        if (!reply) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "failed creation comment reply");

        return reply;
    }

    async getAllComments({ userId, postId, query }: { userId: string; postId: string; query: Record<string, any>; }): Promise<{ pagination: IPagination; data: IPostCommentDocument[]; } | null> {
        const reel = await this.PostRepository.findPostById(postId);
        if (!reel) throw new AppError(StatusCodes.BAD_REQUEST, "This post does not exist");
        const comments = await this.CommentRepository.getCommentsWithReplies({ postId, userId, query });
        return comments;
    }


}