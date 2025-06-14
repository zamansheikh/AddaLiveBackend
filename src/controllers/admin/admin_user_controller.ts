import { Request, Response } from "express";
import { IAdminUserService } from "../../services/admin/admin_user_service";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../core/Utils/catch_async";
import sendResponse, { sendResponseEnhanced } from "../../core/Utils/send_response";

export default class AdminUserController {
    AdminUserService: IAdminUserService;
    constructor(AdminUserService: IAdminUserService) {
        this.AdminUserService = AdminUserService;
    }

    retrieveAllUsers = catchAsync(
        async (req: Request, res: Response) => {
            const users = await this.AdminUserService.retrieveAllUsers() ;
            
            sendResponse(res, {
                statusCode: StatusCodes.ACCEPTED,
                success: true,
                result: users,
                message:  "Users have been successfully retrieved." 
            });
            
            
        }
    )

    updateActivityZone = catchAsync(async (req: Request, res: Response) => {
        const { id, zone, date_till } = req.body;

        const result = await this.AdminUserService.updateActivityZone({ id: id, zone: zone, dateTill: date_till });

       sendResponseEnhanced(res, result);
    });
}