import { Request, Response } from "express";
import { IAdminUserService } from "../../services/admin/admin_user_service";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../core/Utils/catch_async";
import sendResponse, { sendResponseEnhanced } from "../../core/Utils/send_response";
import AppError from "../../core/errors/app_errors";
import { log } from "console";
import { ModeratorPermissions, UserRoles } from "../../core/Utils/enums";
import { validatePromoteUserPermission } from "../../core/Utils/helper_functions";

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
    );

    loginAdmin = catchAsync(
        async (req: Request, res: Response) => {
            const { username, password } = req.body;
            if (!username || !password) throw new AppError(StatusCodes.BAD_REQUEST, "username and password are required");
            const { user, token } = await this.AdminUserService.loginAdmin({ username, password });
            sendResponse(res, {
                statusCode: StatusCodes.OK,
                success: true,
                result: [user],
                access_token: token,
                message: "Admin logged in successfully"
            });
        }
    );

    updateAdmin = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const { username, password, email, role, coins } = req.body;
            if (role) throw new AppError(StatusCodes.FORBIDDEN, "Role cannot be updated");
            if (coins && Number(coins) <= 0) throw new AppError(StatusCodes.BAD_REQUEST, "Coins cannot be less than or equal to 0");
            if (!username && !password && !email && !coins) throw new AppError(StatusCodes.BAD_REQUEST, "At least one field (username, password, coins, or email) is required for update");
            const updatedAdmin = await this.AdminUserService.updateAdmin(id, { username, password, email, coins });
            sendResponse(res, {
                statusCode: StatusCodes.OK,
                success: true,
                result: updatedAdmin,
                message: "Admin updated successfully"
            });
        }
    );

    searchUsersByEmail = catchAsync(
        async (req: Request, res: Response) => {
            const { email } = req.query;
            if (!email) throw new AppError(StatusCodes.BAD_REQUEST, "Email query parameter is required");
            const result = await this.AdminUserService.searchUserEmail(email as string, req.query);
            sendResponse(res, {
                statusCode: StatusCodes.OK,
                success: true,
                result: result?.users,
                meta: result?.pagination,
                message: "Users retrieved successfully"
            });
        }
    );


    deleteAdmin = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.params;
            const deletedAdmin = await this.AdminUserService.deleteAdmin(id);
            sendResponse(res, {
                statusCode: StatusCodes.OK,
                success: true,
                result: deletedAdmin,
                message: "Admin deleted successfully"
            });
        }
    );

    promoteUser = catchAsync(
        async (req: Request, res: Response) => {
            const { userId } = req.body;
            const { permissions } = req.body;
            validatePromoteUserPermission(permissions);
            const updatedUser = await this.AdminUserService.promoteUser(userId, permissions);
            sendResponse(res, {
                statusCode: StatusCodes.OK,
                success: true,
                result: updatedUser,
                message: "User promoted to moderator successfully"
            });
        }
    );

    getAllModerators = catchAsync(
        async (req: Request, res: Response) => {
            const moderators = await this.AdminUserService.getAllModerators(req.query as Record<string, unknown>);
            sendResponse(res, {
                statusCode: StatusCodes.OK,
                success: true,
                result: moderators,
                message: "Moderators retrieved successfully"
            });
        }
    );

    moderatorPermissionEdit = catchAsync(
        async (req: Request, res: Response) => {
            const { userId, permissions } = req.body;
            validatePromoteUserPermission(permissions);
            const updatedUser = await this.AdminUserService.updatePermissions(userId, permissions);
            sendResponse(res, {
                statusCode: StatusCodes.OK,
                success: true,
                result: updatedUser,
                message: `Moderator permissions updated successfully: ${permissions.join(", ")}`
            });
        }
    );

    removePermissions = catchAsync(
        async (req: Request, res: Response) => {
            const { userId, permissions } = req.body;
            validatePromoteUserPermission(permissions);
            const updatedUser = await this.AdminUserService.removePermissions(userId, permissions);
            sendResponse(res, {
                statusCode: StatusCodes.OK,
                success: true,
                result: updatedUser,
                message: `Moderator permissions removed successfully: ${permissions.join(", ")}`
            });
        }
    );

    demoteUser = catchAsync(
        async (req: Request, res: Response) => {
            const { userId } = req.body;
            const updatedUser = await this.AdminUserService.demoteUser(userId);
            sendResponse(res, {
                statusCode: StatusCodes.OK,
                success: true,
                result: updatedUser,
                message: "User demoted to regular user successfully"
            });
        }
    );



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

    assignCoinToUser = catchAsync(
        async (req: Request, res: Response) => {
            const { userId, coins } = req.body;
            const { id, role } = req.user!;
            if (!userId || !coins) throw new AppError(StatusCodes.BAD_REQUEST, "User ID and coins are required");
            if (coins <= 0) throw new AppError(StatusCodes.BAD_REQUEST, "Coins must be greater than 0");
            if (!Object.values(UserRoles).includes(role as UserRoles)) throw new AppError(StatusCodes.UNAUTHORIZED, "Role is not of correct type");
            const updatedUser = await this.AdminUserService.assignCoinToUser(userId, coins, id, role as UserRoles);
            sendResponse(res, {
                statusCode: StatusCodes.OK,
                success: true,
                result: updatedUser,
                message: "Coins assigned to user successfully"
            });
        }
    );

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

    createGift = catchAsync(async (req: Request, res: Response) => {
        const { giftName, category, coinPrice, diamonds } = req.body;
        const files = req.files as unknown as IGiftFile;

        if (!files)
            throw new AppError(StatusCodes.BAD_REQUEST, "Images are required");
        if (!files.previewImage || !files.svgaImage)
            throw new AppError(StatusCodes.BAD_REQUEST, "Either previewImage or svgaImage fields cannot be missing");
        if (files.previewImage[0].mimetype !== "image/png")
            throw new AppError(StatusCodes.BAD_REQUEST, "Preview image must be a png file");
        if (isNaN(coinPrice) || isNaN(diamonds))
            throw new AppError(StatusCodes.BAD_REQUEST, "Coin price and diamonds must be numbers");
        if (coinPrice < 1)
            throw new AppError(StatusCodes.BAD_REQUEST, "Coin price must be greater than 0");
        if (diamonds < 1)
            throw new AppError(StatusCodes.BAD_REQUEST, "Diamonds must be greater than 0");

        const newGift = await this.AdminUserService.createGift({ name: giftName, category, coinPrice: parseInt(coinPrice, 10), diamonds: parseInt(diamonds, 10), previewImage: files.previewImage[0], svgaImage: files.svgaImage[0] });
        sendResponse(res, {
            statusCode: StatusCodes.CREATED,
            success: true,
            result: newGift,
            message: "Gift created successfully"
        });
    });

    getGifts = catchAsync(async (req: Request, res: Response) => {
        const gifts = await this.AdminUserService.getGifts();
        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            result: gifts,
            message: "Gifts retrieved successfully"
        });
    });

    updateGift = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { giftName, category, coinPrice, diamonds } = req.body;
        const files = req.files as unknown as IGiftFile;
        const previewImage = files.previewImage?.[0];
        const svgaImage = files.svgaImage?.[0];
        const image = previewImage || svgaImage;
        if (!giftName && !coinPrice && !diamonds && !image) throw new AppError(StatusCodes.BAD_REQUEST, "At least one field (giftName, category, coinPrice, or diamonds) is required for update");
        if (coinPrice && (isNaN(coinPrice) || coinPrice < 1)) throw new AppError(StatusCodes.BAD_REQUEST, "Coin price must be a number greater than 0");
        if (diamonds && (isNaN(diamonds) || diamonds < 1)) throw new AppError(StatusCodes.BAD_REQUEST, "Diamonds must be a number greater than 0");

        const updatedGift = await this.AdminUserService.updateGift(id, { name: giftName, category, coinPrice, diamonds, svgaImage, previewImage });
        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            result: updatedGift,
            message: "Gift updated successfully"
        });
    });

    deleteGift = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params;
        const deletedGift = await this.AdminUserService.deleteGift(id);
        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            result: deletedGift,
            message: "Gift deleted successfully"
        });
    });




}

export interface IGiftFile {
    previewImage?: Express.Multer.File[];
    svgaImage?: Express.Multer.File[];
}