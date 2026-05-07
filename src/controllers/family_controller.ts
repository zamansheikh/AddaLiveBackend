import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import { IFamilyService } from "../services/family/family_service";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../core/Utils/send_response";
import {
  validateEnum,
  validateFieldExistance,
  validateNumber,
} from "../core/Utils/helper_functions";
import { FamilyJoinMode, FamilyMemberRole } from "../core/Utils/enums";
import { IFamily } from "../models/family/family_model";
import AppError from "../core/errors/app_errors";

export default class FamilyController {
  Service: IFamilyService;
  constructor(service: IFamilyService) {
    this.Service = service;
  }

  createFamily = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;

    const { name, introduction, joinMode, minLevel, memberLimit, coverPhoto } =
      req.body;

    validateFieldExistance(name, "name");
    validateFieldExistance(introduction, "introduction");
    validateFieldExistance(joinMode, "joinMode");
    if (joinMode) {
      validateEnum(joinMode, FamilyJoinMode, "joinMode");
    }
    const familyObject: IFamily = {
      name,
      introduction,
      coverPhoto,
      joinMode,
      minLevel,
      leaderId: id,
      memberCount: 1,
      memberLimit,
      totalGifts: 0,
      lastUpdatedAt: new Date(),
      lastEmptyAt: new Date(),
    };
    const family = await this.Service.createFamily(familyObject);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: family,
      message: "Family created successfully",
    });
  });

  updateFamily = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { name, introduction, joinMode, minLevel, memberLimit, coverPhoto } =
      req.body;
    if (
      !name &&
      !introduction &&
      !joinMode &&
      !minLevel &&
      !memberLimit &&
      !coverPhoto
    ) {
      throw new AppError(StatusCodes.BAD_REQUEST, "No field to update");
    }
    if (joinMode) {
      validateEnum(joinMode, FamilyJoinMode, "joinMode");
    }
    const family = await this.Service.updateFamilyInformation(id, req.body);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: family,
      message: "Family updated successfully",
    });
  });

  joinFamily = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { familyId } = req.params;
    const result = await this.Service.joinFamily(id, familyId);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result,
      message: "Family join request processed",
    });
  });

  getJoinRequests = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const requests = await this.Service.getFamilyJoinRequests(id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: requests,
      message: "Family join requests fetched successfully",
    });
  });

  approveJoinRequest = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { requestId } = req.params;
    const request = await this.Service.approveFamilyJoinRequest(id, requestId);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: request,
      message: "Family join request approved",
    });
  });

  rejectJoinRequest = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { requestId } = req.params;
    const request = await this.Service.rejectFamilyJoinRequest(id, requestId);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: request,
      message: "Family join request rejected",
    });
  });

  getJoinStatus = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const status = await this.Service.getFamilyJoinStatus(id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: status,
      message: "Family join status fetched",
    });
  });

  changeMemberRole = catchAsync(async (req: Request, res: Response) => {
    const { id: callerId } = req.user!;
    const { userId: memberId } = req.params;
    const { role } = req.body;

    validateFieldExistance(role, "role");
    validateEnum(role, FamilyMemberRole, "role");

    const updatedMember = await this.Service.changeMemberRole(
      callerId,
      memberId,
      role,
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: updatedMember,
      message: "Member role updated successfully",
    });
  });

  getLastWeekRanking = catchAsync(async (req: Request, res: Response) => {
    const ranking = await this.Service.getLastWeekRanking();
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: ranking,
      message: "Last week family ranking fetched successfully",
    });
  });

  getThisWeekRanking = catchAsync(async (req: Request, res: Response) => {
    const ranking = await this.Service.getThisWeekRanking();
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: ranking,
      message: "This week family ranking fetched successfully",
    });
  });

  getFamilyDetails = catchAsync(async (req: Request, res: Response) => {
    const { familyId } = req.params;
    const details = await this.Service.getFamilyDetails(familyId);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: details,
      message: "Family details fetched successfully",
    });
  });
}
