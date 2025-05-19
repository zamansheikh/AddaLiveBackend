import { IReelEntity } from "../../entities/reel_entity_interface";
import { IReelReactionRepository } from "../../repository/reels/likes/reel_reaction_interface";
import { IReelRepository } from "../../repository/reels/reels_interface";
import { CloudinaryFolder } from "../../Utils/enums";
import { uploadFileToCloudinary } from "../../Utils/upload_file_cloudinary";
import { IReelService } from "./reel_service_interface";
import { ReactionType } from "../../Utils/enums";
import { IReelCommentRepository } from "../../repository/reels/comments/reel_comments_interface";
import { IReelsCommentDocument } from "../../models/reels/comments/reels_comment_interface";
import {  IReelsReactionDocument } from "../../models/reels/likes/reels_reaction_interface";
import { IReelDocument } from "../../models/reels/reel_interface";



export default class ReelsService implements IReelService {

    ReelRepository: IReelRepository;
    ReactionRepository: IReelReactionRepository;
    CommentRepository: IReelCommentRepository;
    CommentReaction: IReelReactionRepository
    constructor(ReelRepository: IReelRepository, ReactionRepository: IReelReactionRepository, CommentRepository: IReelCommentRepository, CommentReactionRepository: IReelReactionRepository) {
        this.ReelRepository = ReelRepository;
        this.ReactionRepository = ReactionRepository;
        this.CommentRepository = CommentRepository;
        this.CommentReaction = CommentReactionRepository;
    }

    async createReel({ ownerId, body, file }: { ownerId: string, body: Partial<Record<string, any>>, file: Express.Multer.File }) {
        body["ownerId"] = ownerId;
        const length = Number(body.video_length);
        if (length > 60) return "video length exceeded limit of 60 seconds";
        try {
            const reelUrl = await uploadFileToCloudinary({ isVideo: true, folder: CloudinaryFolder.Reels, file });
            body["reelUrl"] = reelUrl;
            return await this.ReelRepository.create(body as IReelEntity)
        } catch (error) {
            console.log("Cloudinary error => ", error);
            return "Upload failed";
        }
    }

    async editReel({ reelID, reelCaption, userId }: { reelID: string, reelCaption: string, userId: string }) {
        const reel = await this.ReelRepository.findReelById(reelID);
        if (!reel) return "Reel Does not exist";
        if (reel.ownerId != userId) return "User does not have permission to edit the reel";
        return await this.ReelRepository.findReelByIdAndUpdate(reelID, { reelCaption })
    }

    async deleteReel({ reelID, userId }: { reelID: string; userId: string; }): Promise<IReelDocument | string | null> {
        const reel = await this.ReelRepository.findReelById(reelID);
        if (!reel) return "reel not found";
        if (reel.ownerId.toString() != userId) return "user is not authorized to delete the reel";

        const deletedReel = this.ReelRepository.deleteReelById(reelID);
        return deletedReel;
    }

    async reactOnReels({ reelId, reaction_type, userID }: { reelId: string, reaction_type: string, userID: string }) {
        if (!Object.values(ReactionType).includes(reaction_type as ReactionType)) {
            return "reaction_type is of wrong type";
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
            if (existingReaction.reaction_type === reaction_type) {
                const delReaction = await this.ReactionRepository.deleteReactionByID(id as string);
                if (delReaction) return await this.ReelRepository.updateCount({
                    reelId,
                    count: -1,
                    isReaction: true,
                });

                return "Something went wrong while unliking the post";
            }

            // Update to new reaction type
            return await this.ReactionRepository.findReelReactopnByIdAndUpdate(id as string, { reaction_type });
        }

        // No reaction exists — create a new one
        const newReaction = await this.ReactionRepository.create({
            reactedBy: userID,
            reactedTo: reelId,
            reaction_type: reaction_type as ReactionType,
        });

        if (!newReaction) {
            return "something went wrong while registering the reaction in the database";
        }

        const updatedReel = await this.ReelRepository.updateCount({
            reelId,
            count: 1,
            isReaction: true,
        });

        if (!updatedReel) {
            return "updating the reactions failed";
        }

        return updatedReel;
    }

    async commnetOnReels({ reelId, commentText, userID }: { reelId: string, commentText: string, userID: string }): Promise<IReelDocument | IReelsCommentDocument | string | null> {
        console.log(reelId, commentText, userID);
        // checking if the reel exists
        const reel = await this.ReelRepository.findReelById(reelId);
        if (!reel) return "either wrong reel Id, or does not exist";

        const comment = await this.CommentRepository.create({ commentedBy: userID, article: commentText, commentedTo: reelId });
        if (!comment) return "failed creating comment";

        const reelComment = await this.ReelRepository.updateCount({ reelId: reelId, count: 1, isReaction: false });
        if (!reelComment) return "failed incrementing comment count"
        return comment;
    }

    async deleteComment({ userId, commentId, reelId }: { userId: string, commentId: string, reelId: string }): Promise<IReelDocument | IReelsCommentDocument | string | null> {
        console.log(reelId);

        const comment = await this.CommentRepository.findCommentById(commentId);
        if (!comment) return "Commnet does not exist";
        if (comment.commentedBy.toString() != userId) return "User is not authorized to delete this comment";
        if (comment.commentedTo.toString() != reelId) return "this reel id does not contain this comment";

        const deletedComment = await this.CommentRepository.deleteCommentByID(commentId);
        if (!deletedComment) return "deleting the comment failed";

        const reel = this.ReelRepository.updateCount({ reelId, count: -1, isReaction: false });
        if (!reel) return "decrementing the reel comment count failed";

        return deletedComment;

    }

    async editComment({ userId, commentId, newComment }: { userId: string; commentId: string; newComment: string; }): Promise<IReelDocument | IReelsCommentDocument | string | null> {
        const comment = await this.CommentRepository.findCommentById(commentId);
        if (!comment) return "Comment does not exist";
        if (comment.commentedBy.toString() != userId) return "User is not authorized to edit this comment";
        const updatedComment = await this.CommentRepository.findCommentByIdAndUpdate(commentId, { article: newComment })
        return updatedComment;

    }

    async reactOnComment({ userId, commentId, reaction_type }: { userId: string; commentId: string; reaction_type: string; }): Promise<IReelsCommentDocument | IReelsReactionDocument | string | null> {
        if (!Object.values(ReactionType).includes(reaction_type as ReactionType)) {
            return "Reaction_type is not of the right type";
        }

        const reaction = await this.CommentReaction.findReelReactionsConditionally({ reactedTo: commentId, reactedBy: userId });

        if (reaction && reaction.length > 0) {
            const reactionID = reaction[0]._id as string;
            if (reaction[0].reaction_type == reaction_type) {
                const deletedReaction = this.CommentReaction.deleteReactionByID(reactionID);
                if (!deletedReaction) return "deleting the reaction failed";
                const comment = await this.CommentRepository.updateCount(commentId, { reactionsCount: -1 });
                return comment;
            }

            const updatedReaction = await this.CommentReaction.findReelReactopnByIdAndUpdate(reactionID, { reaction_type });
            if (!updatedReaction) return "updating the reaction failed";
            return updatedReaction;
        }

        const reactionOnComment = await this.CommentReaction.create({ reactedBy: userId, reactedTo: commentId, reaction_type: reaction_type as ReactionType });
        if (!reactionOnComment) return "creation of nreaction on comment failed";
        const comment = await this.CommentRepository.updateCount(commentId, { reactionsCount: 1 });
        if (!comment) return "Incrementing comment reaction count failed";
        return comment;

    }

    async replyToComment({ userId, commentId, commentText, reelId }: { userId: string; commentId: string; commentText: string; reelId: string }): Promise<IReelsCommentDocument | string | null> {
        console.log(reelId);
        
        const reel = await this.ReelRepository.findReelById(reelId);
        if(!reel) return "either reelId is not valid or the reel does not exist";

        const comment = await this.CommentRepository.findCommentById(commentId);
        if(!comment) return "either the commentId is not valid or the comment does not exist";

        if(comment.commentedTo.toString() != reelId) return "the comment does not belong to this reel";
        
        const reply = await this.CommentRepository.create({article: commentText, commentedBy: userId, commentedTo:reelId, parentComment: commentId });
        if(!reply) return "failed creation comment reply";

        return reply;
    }

     async getAllComments({ userId, reelId }: { userId: string; reelId: string; }): Promise<IReelsCommentDocument[] | null | string> {
         
        const comments =  await this.CommentRepository.getCommentsWithReplies({reelId});

        // console.log(comments);

        return comments;
        
        
     }

}



