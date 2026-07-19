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
    const files = req.files as { icon?: Express.Multer.File[]; levelTag?: Express.Multer.File[] };
    const icon = files?.icon?.[0];
    const levelTag = files?.levelTag?.[0];

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
      levelTag,
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
    const files = req.files as { icon?: Express.Multer.File[]; levelTag?: Express.Multer.File[] };
    const icon = files?.icon?.[0];
    const levelTag = files?.levelTag?.[0];

    if (!name && !level && !description && !icon && !levelTag) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "At least one field (name, level, description, icon, levelTag) is required for update",
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

    const medal = await this.MedalService.updateMedal(id, updateData, icon, levelTag);

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

  /**
   * PUT /api/medals/equip
   * Body: { medalIds: string[] } — the full ordered set the user wants to wear.
   * Replaces the current worn set. Only earned medals are accepted.
   */
  equipMedals = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { medalIds } = req.body;
    const activeMedals = await this.MedalService.equipMedals(userId, medalIds);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: { activeMedals },
      message: "Current medals updated successfully",
    });
  });
}
