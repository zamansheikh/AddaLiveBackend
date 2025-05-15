import { Request, Response } from "express";
import sendResponse, { sendResponseEnhanced } from "../Utils/send_response";
import { StatusCodes } from "http-status-codes";
import { IReelService } from "../services/reels/reel_service_interface";
import catchAsync from "../Utils/catch_async";
import { IReelDocument } from "../models/reels/reel_interface";



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

}