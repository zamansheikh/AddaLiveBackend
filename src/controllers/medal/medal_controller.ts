import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../core/Utils/catch_async";
import sendResponse from "../../core/Utils/send_response";
import AppError from "../../core/errors/app_errors";
import { IMedalService } from "../../services/medal/medal_service";

export default class MedalController {
  MedalService: IMedalService;

  constructor(MedalService: IMedalService) {
    this.MedalService = MedalService;
  }

  createMedal = catchAsync(async (req: Request, res: Response) => {
    const { name, level, description } = req.body;
    const icon = req.file as Express.Multer.File;

    if (!name || !level || !icon) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "name, level, and icon are required",
      );
    }

    if (isNaN(Number(level))) {
      throw new AppError(StatusCodes.BAD_REQUEST, "level must be a number");
    }

    const medal = await this.MedalService.createMedal(
      name,
      Number(level),
      icon,
      description,
    );

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      result: medal,
      message: "Medal created successfully",
    });
  });

  getAllMedals = catchAsync(async (req: Request, res: Response) => {
    const medals = await this.MedalService.getAllMedals();

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: medals,
      message: "Medals retrieved successfully",
    });
  });

  getMedalById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const medal = await this.MedalService.getMedalById(id);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: medal,
      message: "Medal retrieved successfully",
    });
  });

  updateMedal = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, level, description } = req.body;
    const icon = req.file as Express.Multer.File;

    if (!name && !level && !description && !icon) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "At least one field (name, level, description, icon) is required for update",
      );
    }

    const updateData: Record<string, any> = {};
    if (name) updateData.name = name;
    if (level !== undefined) {
      if (isNaN(Number(level))) {
        throw new AppError(StatusCodes.BAD_REQUEST, "level must be a number");
      }
      updateData.level = Number(level);
    }
    if (description !== undefined) updateData.description = description;

    const medal = await this.MedalService.updateMedal(id, updateData, icon);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: medal,
      message: "Medal updated successfully",
    });
  });

  deleteMedal = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const medal = await this.MedalService.deleteMedal(id);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: medal,
      message: "Medal deleted successfully",
    });
  });

  retroactiveAward = catchAsync(async (req: Request, res: Response) => {
    const result = await this.MedalService.retroactiveAward();

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result,
      message: `Retroactive award complete: ${result.totalAwarded} medal(s) awarded`,
    });
  });

  getMedalsWithUserStatus = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const medals = await this.MedalService.getMedalsWithUserStatus(userId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: medals,
      message: "Medals with status retrieved successfully",
    });
  });
}
