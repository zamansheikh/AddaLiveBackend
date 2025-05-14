import { Request, Response } from "express";
import { IAuthService } from "../services/auth/auth_service_interface";

import { StatusCodes } from "http-status-codes";
import catchAsync from "../Utils/catch_async";
import sendResponse from "../Utils/send_response";

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
        sendResponse(res, {
            statusCode: StatusCodes.ACCEPTED,
            success: true,
            result: [updatedUser],
            message: "User Updated Successfully"
        });
       
    });

}
