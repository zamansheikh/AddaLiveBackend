import { Request, Response } from "express";

import sendResponse from "../Utils/send_response";
import { StatusCodes } from "http-status-codes";
import { IReelService } from "../services/reels/reel_interface";
import catchAsync from "../Utils/catch_async";

export default class ReelController {
    ReelService: IReelService;
    constructor(ReelService: IReelService) {
        this.ReelService = ReelService;
    }


    createReel = catchAsync(
        async (req: Request, res: Response) => {
            const reel = await this.ReelService.createReel({ body: req.body, file: req.file });
            const success = reel != null;
            sendResponse(res, {
                statusCode: success ? StatusCodes.ACCEPTED : StatusCodes.BAD_REQUEST,
                success,
                result: reel ?? null
            });
        }
    );

}