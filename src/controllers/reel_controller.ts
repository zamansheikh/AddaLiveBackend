import { Request, Response } from "express";
import sendResponse, { sendResponseEnhanced } from "../Utils/send_response";
import { IReelService } from "../services/reels/reel_service_interface";
import catchAsync from "../Utils/catch_async";



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

    reactOnReel = catchAsync(
        async (req: Request, res: Response) => {
            const { reaction_type, reelId } = req.body;
            const { id } = req.user!;

            const reel = await this.ReelService.reactOnReels({ reaction_type, reelId, userID: id });
            sendResponseEnhanced(res, reel);
        }
    );

}