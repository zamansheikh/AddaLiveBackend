import { Request, Response } from "express";

import sendResponse from "../Utils/send_response";
import { StatusCodes } from "http-status-codes";
import { IReelService } from "../services/reels/reel_interface";

export default class ReelController {
    ReelService: IReelService;
    constructor(ReelService: IReelService) {
        this.ReelService = ReelService;
    }


    createReel = async (req: Request, res: Response) => {
        console.log("body => ", req.body);
        console.log("file => ", req.file);

        this.ReelService.createReel({ownerID: req.body.ownerId, file: req.file});

        sendResponse(res, {
            statusCode: StatusCodes.ACCEPTED,
            success: true,
        })
    }

}