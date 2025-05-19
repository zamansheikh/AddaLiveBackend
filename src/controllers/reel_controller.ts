import { Request, Response } from "express";
import sendResponse, { sendResponseEnhanced } from "../Utils/send_response";
import { IReelService } from "../services/reels/reel_service_interface";
import catchAsync from "../Utils/catch_async";
import User from "../models/user/user_model";



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
            console.log(req.params);

            const reel = await this.ReelService.deleteComment({ commentId, reelId, userId: id });
            sendResponseEnhanced(res, reel);
        }
    );

    editComment = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const { commentId, newComment } = req.body;
            console.log(req.params);
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
            const comments = await this.ReelService.getAllComments({ reelId, userId: id });
            sendResponseEnhanced(res, comments);
        }
    );

}