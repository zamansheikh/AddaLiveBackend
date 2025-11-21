import { Request, Response } from "express";
import { IAuthService } from "../services/auth/auth_service_interface";

import { StatusCodes } from "http-status-codes";
import catchAsync from "../core/Utils/catch_async";
import sendResponse, {
  sendResponseEnhanced,
} from "../core/Utils/send_response";
import AppError from "../core/errors/app_errors";
import {
  StreamType,
  WhoCanTextMe,
  WhoCanTextMeLevelTypes,
} from "../core/Utils/enums";
import { validateWithdrawBonus } from "../core/Utils/helper_functions";
import Stream from "stream";

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
    const avatar = req.files && (req.files as any)["avatar"]?.[0];
    const coverPicture = req.files && (req.files as any)["coverPicture"]?.[0];

    const updatedUser = await this.authService.updateProfile({
      id: userId,
      profileData: req.body,
      avatar,
      coverPicture,
    });
    sendResponseEnhanced(res, updatedUser);
  });

  getMyDetails = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const user = await this.authService.retrieveMyDetails(id);
    sendResponseEnhanced(res, user);
  });

  getUserDetails = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const userID = req.params.id;
    const user = await this.authService.retrieveUserDetails(userID, id);
    sendResponseEnhanced(res, user);
  });

  deleteMyAccount = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const deletedUser = await this.authService.deleteMyAccount(id);
    sendResponseEnhanced(res, deletedUser);
  });

  giftUser = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { userId, roomId, giftId, qty } = req.body;
    if (!Array.isArray(userId))
      throw new AppError(StatusCodes.BAD_REQUEST, "userId must be an array");
    if (isNaN(Number(qty)))
      throw new AppError(StatusCodes.BAD_REQUEST, "qty must be a number");
    if (qty < 1)
      throw new AppError(StatusCodes.BAD_REQUEST, "qty must be greater than 0");
    const giftedUser = await this.authService.giftUser({
      targetUserIds: userId,
      myId: id,
      roomId,
      giftId,
      qty,
    });
    sendResponseEnhanced(res, giftedUser);
  });

  addDailtyBonus = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { totalTime, type } = req.body;
    // if (type == StreamType.Audio)
    //   throw new AppError(
    //     StatusCodes.BAD_REQUEST,
    //     "Audio stream type is not supported for daily bonus"
    //   );
    if (!Object.values(StreamType).includes(type))
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `${type} is not a valid stream type`
      );
    if (isNaN(Number(totalTime)))
      throw new AppError(StatusCodes.BAD_REQUEST, "totalTime must be a number");
    if (totalTime < 0)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "totalTime must be greater than or equal to 0"
      );

    const updatedUser = await this.authService.getDailyBonus(
      id,
      totalTime,
      type
    );
    sendResponseEnhanced(res, updatedUser);
  });

  withdrawBonus = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    validateWithdrawBonus(req.body);
    const { accountType, accountNumber, totalSalary } = req.body;
    const updatedUser = await this.authService.withdrawBonus({
      accountNumber,
      accountType,
      hostId: id,
      totalSalary,
    });
    sendResponseEnhanced(res, updatedUser);
  });

  getMyBonus = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const bonus = await this.authService.getMyBonus(id);
    sendResponseEnhanced(res, { bonus });
  });

  generateToken = catchAsync(async (req: Request, res: Response) => {
    let { channelName, uid, APP_ID, APP_CERTIFICATE } = req.body;
    APP_ID = APP_ID || process.env.AGORA_APP_ID;
    APP_CERTIFICATE = APP_CERTIFICATE || process.env.PRIMARY_CERTIFICATE;
    const token = await this.authService.generateToken({
      channelName,
      uid,
      APP_CERTIFICATE,
      APP_ID,
    });
    sendResponseEnhanced(res, token);
  });

  setChatPrivacy = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { whoCanTextMe, highLevelRequirements } = req.body;

    if (!Object.values(WhoCanTextMe).includes(whoCanTextMe))
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `${whoCanTextMe} is not a valid option`
      );
    if (whoCanTextMe === WhoCanTextMe.HighLevel) {
      if (!highLevelRequirements || highLevelRequirements.length < 1)
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          "highLevelRequirements is required when whoCanTextMe is HighLevel"
        );
      for (const requirement of highLevelRequirements) {
        if (!requirement.levelType || !requirement.level)
          throw new AppError(
            StatusCodes.BAD_REQUEST,
            "levelType and level are required for each highLevelRequirement"
          );
        if (
          !Object.values(WhoCanTextMeLevelTypes).includes(requirement.levelType)
        )
          throw new AppError(
            StatusCodes.BAD_REQUEST,
            `${requirement.levelType} is not a valid level type`
          );
        if (typeof requirement.level !== "number")
          throw new AppError(StatusCodes.BAD_REQUEST, "level must be a number");
      }
    }
    if (
      highLevelRequirements &&
      highLevelRequirements.length > 0 &&
      whoCanTextMe !== WhoCanTextMe.HighLevel
    )
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "highLevelRequirements can only be used when whoCanTextMe is HighLevel"
      );
    const updatedUser = await this.authService.setChatPrivacy({
      id,
      whoCanTextMe,
      highLevelRequirements,
    });
    sendResponseEnhanced(res, updatedUser);
  });

  agencyJoinRequest = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { agencyId } = req.body;
    if (!agencyId)
      throw new AppError(StatusCodes.BAD_REQUEST, "agencyId is required");
    const newRequest = await this.authService.agencyJoinRequest({
      userId: id,
      agencyId,
    });
    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      result: newRequest,
      message: "Request to join agency submitted successfully"
    }
    )
  });

  agencyJoinRequestStatus = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const status = await this.authService.joinRequestStatus(id);
    sendResponseEnhanced(res, status);
  });

  agencyCancelRequest = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const deletedRequest = await this.authService.agencyCancelRequest(
      id,
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: deletedRequest,
      message: "Request to join agency cancelled successfully"
    });
  });

  getLiveCountStatus = catchAsync(async (req: Request, res: Response) => {
    const { hostId } = req.params;
    const counts = await this.authService.getLiveStatusCounts(hostId);
    sendResponseEnhanced(res, counts);
  });

  isPremiumUser = catchAsync(async (req: Request, res: Response) => {
    const {id} = req.user!;
    const isPremium = await this.authService.isPremiumUser(id);
    sendResponseEnhanced(res, {isPremium});
  });
}
