import { Request, Response } from "express";
import { IAdminUserService } from "../../services/admin/admin_user_service";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../core/Utils/catch_async";
import sendResponse, { sendResponseEnhanced } from "../../core/Utils/send_response";
import AppError from "../../core/errors/app_errors";

export default class AdminUserController {
    AdminUserService: IAdminUserService;
    constructor(AdminUserService: IAdminUserService) {
        this.AdminUserService = AdminUserService;
    }

    registerAdmin = catchAsync(
        async (req: Request, res: Response) => {
            const { username, password, email } = req.body;
            if (!username || !password || !email) throw new AppError(StatusCodes.BAD_REQUEST, "All fields are required");
            const newAdmin = await this.AdminUserService.registerAdmin({ username, password, email });
            sendResponse(res, {
                statusCode: StatusCodes.CREATED,
                success: true,
                result: newAdmin,
                message: "Admin registered successfully"
            });
        }
    )

    retrieveAllUsers = catchAsync(
        async (req: Request, res: Response) => {
            const users = await this.AdminUserService.retrieveAllUsers();

            sendResponse(res, {
                statusCode: StatusCodes.ACCEPTED,
                success: true,
                result: users,
                message: "Users have been successfully retrieved."
            });


        }
    )

    updateActivityZone = catchAsync(async (req: Request, res: Response) => {
        const { id, zone, date_till } = req.body;
        const result = await this.AdminUserService.updateActivityZone({ id: id, zone: zone, dateTill: date_till });
        sendResponseEnhanced(res, result);
    });


    updateUserStat = catchAsync(async (req: Request, res: Response) => {
        const { stars, diamonds } = req.body;
        const userId = req.params.userId;
        if (!stars && !diamonds) throw new AppError(StatusCodes.BAD_REQUEST, "You must include either stars or diamonds in the request body");
        const result = await this.AdminUserService.updateUserStat({ diamonds, stars, userId });
        sendResponseEnhanced(res, result);
    });
}