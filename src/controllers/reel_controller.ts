import { Request, Response } from "express";
import { IReelService } from "../services/reels/reel_service_interface";
import User from "../models/user/user_model";
import { sendResponseEnhanced } from "../core/Utils/send_response";
import catchAsync from "../core/Utils/catch_async";



export default class ReelController {
    ReelService: IReelService;
    constructor(ReelService: IReelService) {
        this.ReelService = ReelService;
    }
    createReel = catchAsync(
        async (req: Request, res: Response) => {
            const reel = await this.ReelService.createReel({ ownerId: req.user!.id, body: req.body, file: req.file });
            sendResponseEnhanced(res, reel);
        }
    );

    getAllReels = catchAsync(
        async (req: Request, res: Response) => {
            let query = req.query;
            query["userId"] = req.user!.id;
            const allReels = await this.ReelService.getAllReel(query);
            sendResponseEnhanced(res, allReels);
        }
    );

    editReel = catchAsync(
        async (req: Request, res: Response) => {
            const result = await this.ReelService.editReel({ reelID: req.body.reelID, reelCaption: req.body.reelCaption, userId: req.user!.id });
            sendResponseEnhanced(res, result);
        }
    );

    deleteReel = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const { reelId } = req.params;
            const result = await this.ReelService.deleteReel({ reelID: reelId, userId: id });
            sendResponseEnhanced(res, result);
        }
    );

    getUserReels = catchAsync(
        async (req: Request, res: Response) => {
            const { userId } = req.params;
            const allReels = await this.ReelService.getUserReels(userId, req.query);
            sendResponseEnhanced(res, allReels);
        }
    );
    

    reactOnReel = catchAsync(
        async (req: Request, res: Response) => {
            const { reaction_type, reelId } = req.body;
            const { id } = req.user!;

            const reel = await this.ReelService.reactOnReels({ reaction_type, reelId, userID: id });
            sendResponseEnhanced(res, reel);
        }
    );

    commentOnReel = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const { reelId, comment } = req.body;
            const reel = await this.ReelService.commnetOnReels({ commentText: comment, reelId, userID: id });
            sendResponseEnhanced(res, reel);
        }
    );

    deleteComment = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const { reelId, commentId } = req.params;

            const reel = await this.ReelService.deleteComment({ commentId, reelId, userId: id });
            sendResponseEnhanced(res, reel);
        }
    );

    editComment = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const { commentId, newComment } = req.body;
            const reel = await this.ReelService.editComment({ commentId, newComment, userId: id });
            sendResponseEnhanced(res, reel);
        }
    );

    reactOnComment = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const { commentId, reaction_type } = req.body;
            const comment = await this.ReelService.reactOnComment({ commentId, reaction_type, userId: id });
            sendResponseEnhanced(res, comment);
        }
    );

    replyToComment = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const { commentText, commentId, reelId } = req.body;
            const comment = await this.ReelService.replyToComment({ commentId, commentText, userId: id, reelId });
            sendResponseEnhanced(res, comment);
        }
    );

    getAllComments = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const { reelId } = req.params;
            const comments = await this.ReelService.getAllComments({ reelId, userId: id, query: req.query });
            sendResponseEnhanced(res, comments);
        }
    );

}