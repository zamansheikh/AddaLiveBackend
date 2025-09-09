import { IReelReactionRepository } from "../../repository/reels/likes/reel_reaction_interface";
import { IReelRepository } from "../../repository/reels/reels_interface";
import { IReelService } from "./reel_service_interface";
import { IReelCommentRepository } from "../../repository/reels/comments/reel_comments_interface";
import { IReelsCommentDocument } from "../../models/reels/comments/reels_comment_interface";
import { IReelsReactionDocument } from "../../models/reels/likes/reels_reaction_interface";
import { IReelDocument } from "../../models/reels/reel_interface";
import { uploadFileToCloudinary } from "../../core/Utils/upload_file_cloudinary";
import { CloudinaryFolder, ReactionType } from "../../core/Utils/enums";
import AppError from "../../core/errors/app_errors";
import { StatusCodes } from "http-status-codes";
import { IReelEntity } from "../../entities/reel/reel_entity_interface";
import { IUserRepository } from "../../repository/user_repository";
import { IPagination } from "../../core/Utils/query_builder";



export default class ReelsService implements IReelService {

    ReelRepository: IReelRepository;
    ReactionRepository: IReelReactionRepository;
    CommentRepository: IReelCommentRepository;
    CommentReaction: IReelReactionRepository
    UserRepository: IUserRepository;
    constructor(ReelRepository: IReelRepository, ReactionRepository: IReelReactionRepository, CommentRepository: IReelCommentRepository, CommentReactionRepository: IReelReactionRepository, UserRepository: IUserRepository) {
        this.ReelRepository = ReelRepository;
        this.ReactionRepository = ReactionRepository;
        this.CommentRepository = CommentRepository;
        this.CommentReaction = CommentReactionRepository;
        this.UserRepository = UserRepository;
    }

    async createReel({ ownerId, body, file }: { ownerId: string, body: Partial<Record<string, any>>, file: Express.Multer.File }) {
        const user = await this.UserRepository.findUserById(ownerId);
        if (!user) throw new AppError(StatusCodes.BAD_REQUEST, "User does not exist");
        body["ownerId"] = ownerId;
        const length = Number(body.video_length);
        if (length > 60) throw new AppError(StatusCodes.BAD_REQUEST, "Video length exceeded the limit");
        try {
            const reelUrl = await uploadFileToCloudinary({ isVideo: true, folder: CloudinaryFolder.Reels, file });
 
            
            body["reelUrl"] = reelUrl;
            return await this.ReelRepository.create(body as IReelEntity)
        } catch (error) {
            throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Upload failed");
        }
    }

    async getAllReel(query: Record<string, any>) {
        return await this.ReelRepository.getAllReels(query);
    }

    async editReel({ reelID, reelCaption, userId }: { reelID: string, reelCaption: string, userId: string }) {
        const reel = await this.ReelRepository.findReelById(reelID);
        if (!reel) throw new AppError(StatusCodes.BAD_REQUEST, "Reel Does not exist");
        if (reel.ownerId != userId) throw new AppError(StatusCodes.BAD_REQUEST, "User does not have permission to edit the reel");
        return await this.ReelRepository.findReelByIdAndUpdate(reelID, { reelCaption })
    }

    async deleteReel({ reelID, userId }: { reelID: string; userId: string; }): Promise<IReelDocument | string | null> {
        const reel = await this.ReelRepository.findReelById(reelID);
        if (!reel) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "reel not found");
        if (reel.ownerId.toString() != userId) return "user is not authorized to delete the reel";

        const deletedReel = await this.ReelRepository.deleteReelById(reelID);
        return deletedReel;
    }

    async getUserReels(userId: string, query: Record<string, any>): Promise<{ pagination: IPagination; data: IReelDocument[]; }> {
        const user = await this.UserRepository.findUserById(userId);
        if(!user) throw new AppError(StatusCodes.BAD_REQUEST, "User does not exist");
        const reels = await this.ReelRepository.getUserReels(userId, query);
        return reels;
    }

    async reactOnReels({ reelId, reaction_type, userID }: { reelId: string, reaction_type: string, userID: string }) {
        if (!Object.values(ReactionType).includes(reaction_type as ReactionType)) {

            throw new AppError(StatusCodes.BAD_REQUEST, "reaction_type is of wrong type");
        }
        const existingReactions = await this.ReactionRepository.findReelReactionsConditionally({
            reactedTo: reelId,
            reactedBy: userID,
        });

        // If reaction exists
        if (existingReactions && existingReactions.length > 0) {
            const existingReaction = existingReactions[0];
            const id = existingReaction._id;

            // Toggle off if same reaction type
            if (existingReaction.reactionType === reaction_type) {
                const delReaction = await this.ReactionRepository.deleteReactionByID(id as string);
                if (delReaction) return await this.ReelRepository.updateCount({
                    reelId,
                    count: -1,
                    isReaction: true,
                });

                throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Something went wrong while unliking the post");
            }

            // Update to new reaction type
            return await this.ReactionRepository.findReelReactopnByIdAndUpdate(id as string, { reaction_type });
        }

        // No reaction exists — create a new one
        const newReaction = await this.ReactionRepository.create({
            reactedBy: userID,
            reactedTo: reelId,
            reactionType: reaction_type as ReactionType,
        });

        if (!newReaction) {
            throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "something went wrong while registering the reaction in the database");
        }

        const updatedReel = await this.ReelRepository.updateCount({
            reelId,
            count: 1,
            isReaction: true,
        });

        if (!updatedReel) {
            throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "updating the reactions failed");
        }

        return updatedReel;
    }

    async commnetOnReels({ reelId, commentText, userID }: { reelId: string, commentText: string, userID: string }): Promise<IReelDocument | IReelsCommentDocument | string | null> {
        // checking if the reel exists
        const reel = await this.ReelRepository.findReelById(reelId);
        if (!reel) throw new AppError(StatusCodes.BAD_REQUEST, "either wrong reel Id, or does not exist");

        const comment = await this.CommentRepository.create({ commentedBy: userID, article: commentText, commentedTo: reelId });
        if (!comment) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "failed creating comment");

        const reelComment = await this.ReelRepository.updateCount({ reelId: reelId, count: 1, isReaction: false });
        if (!reelComment) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "failed incrementing comment count");
        return comment;
    }

    async deleteComment({ userId, commentId, reelId }: { userId: string, commentId: string, reelId: string }): Promise<IReelDocument | IReelsCommentDocument | string | null> {


        const comment = await this.CommentRepository.findCommentById(commentId);
        if (!comment) throw new AppError(StatusCodes.BAD_REQUEST, "Commnet does not exist");
        if (comment.commentedBy.toString() != userId) throw new AppError(StatusCodes.BAD_REQUEST, "User is not authorized to delete this comment");
        if (comment.commentedTo.toString() != reelId) throw new AppError(StatusCodes.BAD_REQUEST, "this reel id does not contain this comment");


        const deletedComment = await this.CommentRepository.deleteCommentByID(commentId);
        if (!deletedComment) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "deleting the comment failed");

        const reel = this.ReelRepository.updateCount({ reelId, count: -1, isReaction: false });
        if (!reel) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "decrementing the reel comment count failed");

        return deletedComment;

    }

    async editComment({ userId, commentId, newComment }: { userId: string; commentId: string; newComment: string; }): Promise<IReelDocument | IReelsCommentDocument | string | null> {
        const comment = await this.CommentRepository.findCommentById(commentId);
        if (!comment) throw new AppError(StatusCodes.BAD_REQUEST, "Comment does not exist");
        if (comment.commentedBy.toString() != userId) throw new AppError(StatusCodes.BAD_REQUEST, "User is not authorized to edit this comment");
        const updatedComment = await this.CommentRepository.findCommentByIdAndUpdate(commentId, { article: newComment })
        return updatedComment;

    }

    async reactOnComment({ userId, commentId, reaction_type }: { userId: string; commentId: string; reaction_type: string; }): Promise<IReelsCommentDocument | IReelsReactionDocument | string | null> {
        if (!Object.values(ReactionType).includes(reaction_type as ReactionType)) {
            throw new AppError(StatusCodes.BAD_REQUEST, "Reaction_type is not of the right type");
        }

        const reaction = await this.CommentReaction.findReelReactionsConditionally({ reactedTo: commentId, reactedBy: userId });

        if (reaction && reaction.length > 0) {
            const reactionID = reaction[0]._id as string;
            if (reaction[0].reactionType == reaction_type) {
                const deletedReaction = this.CommentReaction.deleteReactionByID(reactionID);
                if (!deletedReaction) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "deleting the reaction failed");
                const comment = await this.CommentRepository.updateCount(commentId, { reactionsCount: -1 });
                return comment;
            }

            const updatedReaction = await this.CommentReaction.findReelReactopnByIdAndUpdate(reactionID, { reaction_type });
            if (!updatedReaction) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR,"updating the reaction failed");
            return updatedReaction;
        }

        const reactionOnComment = await this.CommentReaction.create({ reactedBy: userId, reactedTo: commentId, reactionType: reaction_type as ReactionType });
        if (!reactionOnComment) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "creation of nreaction on comment failed");
        const comment = await this.CommentRepository.updateCount(commentId, { reactionsCount: 1 });
        if (!comment) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Incrementing comment reaction count failed");
        return comment;

    }

    async replyToComment({ userId, commentId, commentText, reelId }: { userId: string; commentId: string; commentText: string; reelId: string }): Promise<IReelsCommentDocument | string | null> {

        const reel = await this.ReelRepository.findReelById(reelId);
        if (!reel) throw new AppError(StatusCodes.BAD_REQUEST,"either reelId is not valid or the reel does not exist");

        const comment = await this.CommentRepository.findCommentById(commentId);
        if (!comment) throw new AppError(StatusCodes.BAD_REQUEST, "either the commentId is not valid or the comment does not exist");

        if (comment.commentedTo.toString() != reelId) throw new AppError(StatusCodes.BAD_REQUEST,"the comment does not belong to this reel");

        const reply = await this.CommentRepository.create({ article: commentText, commentedBy: userId, commentedTo: reelId, parentComment: commentId });
        if (!reply) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "failed creation comment reply");

        return reply;
    }

    async getAllComments({ userId, reelId, query }: { userId: string; reelId: string; query: Record<string, any> }) {
        const reel = await this.ReelRepository.findReelById(reelId);
        if (!reel) throw new AppError(StatusCodes.BAD_REQUEST, "This reel does not exist");

        const comments = await this.CommentRepository.getCommentsWithReplies({ reelId, userId, query });

        return comments;


    }

}



