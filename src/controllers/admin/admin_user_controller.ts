import { Request, Response } from "express";
import { IAdminUserService } from "../../services/admin/admin_user_service";
import catchAsync from "../../Utils/catch_async";
import sendResponse from "../../Utils/send_response";
import { StatusCodes } from "http-status-codes";

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

        sendResponse(res, {
            statusCode: StatusCodes.ACCEPTED,
            success: true,
            message: result == null? req.body.id == null? "User Id is required": "Something unexpected occured" :`The user has been successfully assigned to the ${zone} zone.`,
            result: [
                result
            ]
        });
    });
}