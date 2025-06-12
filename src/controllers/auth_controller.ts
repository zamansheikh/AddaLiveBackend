import { Request, Response } from "express";
import { IAuthService } from "../services/auth/auth_service_interface";

import { StatusCodes } from "http-status-codes";
import catchAsync from "../core/Utils/catch_async";
<<<<<<< HEAD
import sendResponse, { sendResponseEnhanced } from "../core/Utils/send_response";
=======
import sendResponse from "../core/Utils/send_response";
>>>>>>> 3daa7017c0d1b6a65da4bab0dbe1fda4aa7177ef

export default class AuthController {
    authService: IAuthService;
    constructor(authService: IAuthService) {
        this.authService = authService;
    }
<<<<<<< HEAD
=======

>>>>>>> 3daa7017c0d1b6a65da4bab0dbe1fda4aa7177ef
    registerWithGoogle = catchAsync(async (req: Request, res: Response) => {
        const { user, token } = await this.authService.registerWithGoogle(req.body);
        sendResponse(res, {
            statusCode: StatusCodes.ACCEPTED,
            success: true,
            access_token: token,
            result: [user],
        });
    });

<<<<<<< HEAD
    updateProfile = catchAsync(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const updatedUser = await this.authService.updateProfile({ id: userId, profileData: req.body, file: req.file });
        sendResponseEnhanced(res, updatedUser);

    });

    getUserDetails = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.user!;
        const userID = req.params.id;
        const user = await this.authService.retrieveUserDetails(userID, id);
        sendResponseEnhanced(res, user);
    });

    giftUser = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.user!;
        const {giftType, diamonds, userId } = req.body;
        const giftedUser = await this.authService.giftUser({myId: id, giftType, diamonds, userId});
        sendResponseEnhanced(res, giftedUser);
=======

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

    getUserDetails = catchAsync( async(req: Request, res:Response) => {
        const{id} = req.user!;
        const userID = req.params.id;
        const user = await this.authService.retrieveUserDetails(userID, id);
        sendResponse(res, {
            statusCode: StatusCodes.ACCEPTED,
            success: true,
            message: "User details retrieved successfully.",
            result: user
        });
>>>>>>> 3daa7017c0d1b6a65da4bab0dbe1fda4aa7177ef
    });

}
