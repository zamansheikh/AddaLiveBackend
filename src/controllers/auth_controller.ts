import { Request, Response } from "express";
import { IAuthService } from "../services/auth/auth_service_interface";

import { StatusCodes } from "http-status-codes";
import catchAsync from "../core/Utils/catch_async";
import sendResponse, { sendResponseEnhanced } from "../core/Utils/send_response";
import AppError from "../core/errors/app_errors";

export default class AuthController {
    authService: IAuthService;
    constructor(authService: IAuthService) {
        this.authService = authService;
    }
    registerWithGoogle = catchAsync(async (req: Request, res: Response) => {
        const { user, token } = await this.authService.registerWithGoogle(req.body);
        sendResponse(res, {
            statusCode: StatusCodes.ACCEPTED,
            success: true,
            access_token: token,
            result: [user],
        });
    });

    updateProfile = catchAsync(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const updatedUser = await this.authService.updateProfile({ id: userId, profileData: req.body, file: req.file });
        sendResponseEnhanced(res, updatedUser);

    });

    getMyDetails = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.user!;
        const user = await this.authService.retrieveMyDetails(id);
        sendResponseEnhanced(res, user);
    });


    getUserDetails = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.user!;
        const userID = req.params.id;
        const user = await this.authService.retrieveUserDetails(userID, id);
        sendResponseEnhanced(res, user);
    });

    giftUser = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.user!;
        const { coins, diamonds, userId } = req.body;
        if(coins < 1 || diamonds < 1) throw new AppError(StatusCodes.BAD_REQUEST, "coins and diamonds must be greater than 0");
        const giftedUser = await this.authService.giftUser({ myId: id, coins, diamonds, userId });
        sendResponseEnhanced(res, giftedUser);
    });

    generateToken = catchAsync(async (req: Request, res: Response) => {
        let { channelName, uid, APP_ID, APP_CERTIFICATE } = req.body;
        APP_ID = APP_ID || process.env.AGORA_APP_ID;
        APP_CERTIFICATE = APP_CERTIFICATE || process.env.PRIMARY_CERTIFICATE;
        const token = await this.authService.generateToken({ channelName, uid, APP_CERTIFICATE, APP_ID });
        sendResponseEnhanced(res, token);
    });

}
