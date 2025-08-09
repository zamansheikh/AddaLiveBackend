import { Request, Response } from "express";
import AppError from "../../core/errors/app_errors";
import catchAsync from "../../core/Utils/catch_async";
import { ISharedPowerService } from "../../services/admin/portal_user_service";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../../core/Utils/send_response";
import { UserRoles } from "../../core/Utils/enums";
import { validatePromoteUserPermission } from "../../core/Utils/helper_functions";

export class PortalUserControllers {
  Service: ISharedPowerService;
  constructor(Service: ISharedPowerService) {
    this.Service = Service;
  }

  loginPortalUser = catchAsync(async (req: Request, res: Response) => {
    const { userId, password } = req.body;
    if (!userId || !password)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "userId and password are required"
      );

    const { user, token } = await this.Service.loginPortalUser(
      userId,
      password
    );

    sendResponse(res, {
      statusCode: StatusCodes.BAD_GATEWAY,
      success: true,
      result: user,
      access_token: token,
      message: "loggged in successfully",
    });
  });

  retrieveAllUsers = catchAsync(async (req: Request, res: Response) => {
    const users = await this.Service.retrieveAllUsers(req.query);

    sendResponse(res, {
      statusCode: StatusCodes.ACCEPTED,
      success: true,
      result: users,
      message: "Users have been successfully retrieved.",
    });
  });

  updateMyProfile = catchAsync(async (req: Request, res: Response) => {
    const { id, role } = req.user!;
    const { password, name } = req.body;
    const file = req.file!;
    if (!password && !name && !file)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "At least one field is required (password, name, avatar)"
      );

    const updatedProfile = await this.Service.updateMyProfile(id, {
      password,
      name,
      avatar: file as Express.Multer.File,
    });
    sendResponse(res, {
      statusCode: StatusCodes.BAD_GATEWAY,
      success: true,
      result: updatedProfile,
      message: "profile updated succesfully",
    });
  });

  searchUsersByEmail = catchAsync(async (req: Request, res: Response) => {
    const { email } = req.query;
    if (!email)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Email query parameter is required"
      );
    const result = await this.Service.searchUserEmail(
      email as string,
      req.query
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: result?.users,
      meta: result?.pagination,
      message: "Users retrieved successfully",
    });
  });

  promoteUser = catchAsync(async (req: Request, res: Response) => {
    const { id, role } = req.user!;
    const { permissions, userId } = req.body;
    validatePromoteUserPermission(permissions);
    const updatedUser = await this.Service.promoteUser(
      userId,
      permissions,
      id,
      role as UserRoles
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: updatedUser,
      message: "User promoted to moderator successfully",
    });
  });

  demoteUser = catchAsync(async (req: Request, res: Response) => {
    const { id, role } = req.user!;
    const { userId } = req.body;
    const updatedUser = await this.Service.demoteUser(userId, id, role);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: updatedUser,
      message: "User demoted to regular user successfully",
    });
  });

  assignCoinToUser = catchAsync(async (req: Request, res: Response) => {
    const { userId, coins, userRole } = req.body;
    const { id, role } = req.user!;
    if (!userId || !coins)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "User ID and coins are required"
      );
    if (isNaN(Number(coins)))
      throw new AppError(StatusCodes.BAD_REQUEST, "Coins must be a number");
    if (coins <= 0)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Coins must be greater than 0"
      );
    const updatedUser = await this.Service.assignCoinToUser(
      userId,
      userRole,
      coins,
      id,
      role as UserRoles
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: updatedUser,
      message: "Coins assigned to user successfully",
    });
  });
}
