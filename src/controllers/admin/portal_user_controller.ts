import { Request, Response } from "express";
import AppError from "../../core/errors/app_errors";
import catchAsync from "../../core/Utils/catch_async";
import { ISharedPowerService } from "../../services/admin/portal_user_service";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../../core/Utils/send_response";
import { UserRoles, WithdrawAccountTypes } from "../../core/Utils/enums";
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
      statusCode: StatusCodes.ACCEPTED,
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

  getMyProfile = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const profile = await this.Service.getMyProfile(id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: profile,
      message: "profile retrieved succesfully",
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
  getPortalUsers = catchAsync(async (req: Request, res: Response) => {
    const { userRole } = req.params;
    if (
      !(
        userRole == UserRoles.SubAdmin ||
        userRole == UserRoles.Merchant ||
        userRole == UserRoles.CountryAdmin
      )
    )
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Invalid user role: ${userRole}`
      );

    const users = await this.Service.getPortalUsers(
      userRole as UserRoles,
      req.query
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: users,
      message: "Portal users retrieved successfully",
    });
  });

  getPortalUsersByParent = catchAsync(async (req: Request, res: Response) => {
    const { userRole, parentId } = req.params;
    const { id, role } = req.user!;

    if (
      !(
        userRole == UserRoles.Reseller ||
        userRole == UserRoles.Agency ||
        userRole == UserRoles.countrySubAdmin
      )
    )
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Invalid user role: ${userRole}`
      );

    const users = await this.Service.getPortalChildUsers(
      userRole as UserRoles,
      parentId,
      req.query
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: users,
      message: "Portal users retrieved successfully",
    });
  });

  getHosts = catchAsync(async (req: Request, res: Response) => {
    const { parentId } = req.params;
    const { id, role } = req.user!;
    if (!parentId)
      throw new AppError(StatusCodes.BAD_REQUEST, "Parent ID is required");
    const users = await this.Service.getHosts(parentId, req.query);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: users,
      message: "Hosts retrieved successfully",
    });
  });

  withdrawAgency = catchAsync(async (req: Request, res: Response) => {
    const { accountType, accountNumber, totalSalary } = req.body;
    const { id, role } = req.user!;
    if (!accountType || !accountNumber || !totalSalary)
      throw new AppError(StatusCodes.BAD_REQUEST, "All fields are required");
    if (!Object.values(WithdrawAccountTypes).includes(accountType))
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Invalid account type: ${accountType}`
      );

    const result = await this.Service.agencyWithdraw(id, {
      accountType,
      accountNumber,
      totalSalary,
    });

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: result,
      message: "Withdrawal request submitted successfully",
    });
  });
}
