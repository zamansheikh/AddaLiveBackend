import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import sendResponse from "../core/Utils/send_response";
import { StatusCodes } from "http-status-codes";
import { IAppResellerService } from "../services/app_reseller/app_reseller_service";
import { UserRoles } from "../core/Utils/enums";
import AppError from "../core/errors/app_errors";

export default class AppResellerController {
  Service: IAppResellerService;

  constructor(service: IAppResellerService) {
    this.Service = service;
  }

  giveCoinsToUser = catchAsync(async (req: Request, res: Response) => {
    const { userId, coins } = req.body;
    const { id } = req.user!;

    if (!userId) {
      throw new AppError(StatusCodes.BAD_REQUEST, "userId is required");
    }

    if (coins === undefined || coins === null) {
      throw new AppError(StatusCodes.BAD_REQUEST, "coins is required");
    }

    if (isNaN(Number(coins))) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Coins must be a number");
    }

    if (Number(coins) <= 0) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Coins must be greater than 0",
      );
    }

    if (!Number.isInteger(Number(coins))) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Coins must be a whole number",
      );
    }

    const result = await this.Service.giveCoinsToUser(
      id,
      userId,
      Number(coins),
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result,
      message: `Successfully assigned ${coins} coins to user`,
    });
  });

  getAllResellers = catchAsync(async (req: Request, res: Response) => {
    const result = await this.Service.getAllResellers(
      req.query as Record<string, unknown>,
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: result.users,
      meta: result.pagination,
      message: "Resellers retrieved successfully",
    });
  });

  updateUserRole = catchAsync(async (req: Request, res: Response) => {
    const { userId, role } = req.body;

    if (!userId) {
      throw new AppError(StatusCodes.BAD_REQUEST, "userId is required");
    }

    if (!role) {
      throw new AppError(StatusCodes.BAD_REQUEST, "role is required");
    }

    // Validate the role value against allowed roles
    if (![UserRoles.User, UserRoles.Reseller].includes(role as UserRoles)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Invalid role. Allowed values: "${UserRoles.User}" or "${UserRoles.Reseller}"`,
      );
    }

    const result = await this.Service.updateUserRole(userId, role as UserRoles);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: [result],
      message: `User role updated successfully to "${role}"`,
    });
  });

  giveCoinsToReseller = catchAsync(async (req: Request, res: Response) => {
    const { userId: resellerId, coins } = req.body;
    const { id: senderId, role: senderRole } = req.user!;

    if (!resellerId) {
      throw new AppError(StatusCodes.BAD_REQUEST, "userId is required");
    }

    if (coins === undefined || coins === null) {
      throw new AppError(StatusCodes.BAD_REQUEST, "coins is required");
    }

    if (isNaN(Number(coins))) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Coins must be a number");
    }

    if (Number(coins) <= 0) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Coins must be greater than 0",
      );
    }

    if (!Number.isInteger(Number(coins))) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Coins must be a whole number",
      );
    }

    const result = await this.Service.giveCoinsToReseller(
      senderId,
      senderRole as UserRoles,
      resellerId,
      Number(coins),
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result,
      message: `Successfully assigned ${coins} coins to reseller`,
    });
  });

  getCoinHistory = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const result = await this.Service.getCoinHistory(
      id,
      req.query as Record<string, unknown>,
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: result,
      message: "Coin history retrieved successfully",
    });
  });
}
