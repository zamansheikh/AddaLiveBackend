import { Request, Response } from "express";
import AppError from "../../core/errors/app_errors";
import catchAsync from "../../core/Utils/catch_async";
import { ISharedPowerService } from "../../services/admin/shared_power_service";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../../core/Utils/send_response";
import { UserRoles } from "../../core/Utils/enums";
import { validatePromoteUserPermission } from "../../core/Utils/helper_functions";

export class SharedPowerController {
  Service: ISharedPowerService;
  constructor(Service: ISharedPowerService) {
    this.Service = Service;
  }

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
    const { userId } = req.body;
    const { permissions, userRole } = req.body;
    if (!userRole)
      throw new AppError(StatusCodes.BAD_REQUEST, "User role is required");
    if (!Object.values(UserRoles).includes(userRole))
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid user role");
    validatePromoteUserPermission(permissions);
    const updatedUser = await this.Service.promoteUser(
      userId,
      permissions,
      userRole,
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
    const { userId } = req.body;
    const updatedUser = await this.Service.demoteUser(userId);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: updatedUser,
      message: "User demoted to regular user successfully",
    });
  });

  assignCoinToUser = catchAsync(async (req: Request, res: Response) => {
    const { userId, coins } = req.body;
    const { id, role } = req.user!;
    if (!userId || !coins)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "User ID and coins are required"
      );
    if (coins <= 0)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Coins must be greater than 0"
      );
    if (!Object.values(UserRoles).includes(role as UserRoles))
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        "Role is not of correct type"
      );
    const updatedUser = await this.Service.assignCoinToUser(
      userId,
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
