import { Express } from "express";
import { IReelDocument } from "../../models/reels/reel_interface";
import { IReelsReactionDocument } from "../../models/reels/likes/reels_reaction_interface";
import { IReelsCommentDocument } from "../../models/reels/comments/reels_comment_interface";
import { IPagination } from "../../core/Utils/query_builder";

export interface IReelService {
    
    createReel({ ownerId, body, file }: { ownerId: string, body: Partial<Record<string, any>>, file?: Express.Multer.File }): Promise<IReelDocument | string | null>;
    //! Todo use a different interface
    getAllReel(query: Record<string, any>): Promise<{pagination: IPagination, data: IReelDocument[]} | null | string>; 
    editReel({ reelID, reelCaption, userId }: { reelID: string, reelCaption: string, userId: string }): Promise<IReelDocument | string | null>;
    deleteReel({ reelID, userId }: { reelID: string, userId: string }): Promise<IReelDocument | string | null>;
    getUserReels(userId: string, query: Record<string, any>): Promise<{pagination: IPagination, data: IReelDocument[]}>;
    reactOnReels({ reelId, reaction_type, userID }: { reelId: string, reaction_type: string, userID: string }): Promise<IReelDocument | IReelsReactionDocument | string | null>;
    commnetOnReels({ reelId, commentText, userID }: { reelId: string, commentText: string, userID: string }): Promise<IReelDocument | IReelsCommentDocument | string | null>;
    deleteComment({ userId, commentId, reelId }: { userId: string, commentId: string, reelId: string }): Promise<IReelDocument | IReelsCommentDocument | string | null>;
    editComment({ userId, commentId, newComment }: { userId: string, commentId: string, newComment: string }): Promise<IReelDocument | IReelsCommentDocument | string | null>;
    reactOnComment({ userId, commentId, reaction_type }: { userId: string, commentId: string, reaction_type: string }): Promise<IReelsCommentDocument | IReelsReactionDocument | string | null>;
    replyToComment({ userId, commentId, commentText, reelId }: { userId: string, commentId: string, commentText: string, reelId: string }): Promise<IReelsCommentDocument | string | null>;
    getAllComments({userId, reelId, query}: {userId: string, reelId: string, query: Record<string, any>}) : Promise<{pagination: IPagination, data: IReelsCommentDocument[]}  | null | string>;
}
