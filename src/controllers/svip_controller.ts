import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../core/errors/app_errors";
import catchAsync from "../core/Utils/catch_async";
import { SvipConfigService } from "../services/admin/svip_config_service";
import { SvipService } from "../services/svip/svip_service";

export class SvipController {
  // ── Admin: get SVIP config ─────────────────────────────────────────────
  getConfig = catchAsync(async (req: Request, res: Response) => {
    const config = await SvipConfigService.getConfig();
    res.status(StatusCodes.OK).json({
      status: "success",
      data: config,
    });
  });

  // ── Admin: update SVIP config ──────────────────────────────────────────
  updateConfig = catchAsync(async (req: Request, res: Response) => {
    const { tiers, retentionThreshold } = req.body;

    const updateData: Record<string, any> = {};
    if (tiers !== undefined) {
      if (!Array.isArray(tiers) || tiers.length === 0) {
        throw new AppError(StatusCodes.BAD_REQUEST, "tiers must be a non-empty array");
      }
      for (const t of tiers) {
        if (
          typeof t.tier !== "number" ||
          typeof t.milestoneCoins !== "number" ||
          t.tier < 1 ||
          t.milestoneCoins <= 0
        ) {
          throw new AppError(
            StatusCodes.BAD_REQUEST,
            "Each tier must have a positive tier number and milestoneCoins",
          );
        }
      }
      updateData.tiers = tiers;
    }

    if (retentionThreshold !== undefined) {
      if (
        typeof retentionThreshold !== "number" ||
        retentionThreshold <= 0 ||
        retentionThreshold > 1
      ) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          "retentionThreshold must be a number between 0 and 1",
        );
      }
      updateData.retentionThreshold = retentionThreshold;
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "At least one field (tiers or retentionThreshold) is required",
      );
    }

    const config = await SvipConfigService.updateConfig(updateData);
    res.status(StatusCodes.OK).json({
      status: "success",
      data: config,
    });
  });

  // ── User: get SVIP status ──────────────────────────────────────────────
  getMySvipStatus = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id || (req as any).user?._id;
    if (!userId) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Authentication required");
    }
    const status = await SvipService.getUserStatus(userId);
    res.status(StatusCodes.OK).json({
      status: "success",
      data: status,
    });
  });

  // ── Admin: get SVIP status for a specific user ─────────────────────────
  getUserSvipStatus = catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;
    if (!userId) {
      throw new AppError(StatusCodes.BAD_REQUEST, "userId is required");
    }
    const status = await SvipService.getUserStatus(userId);
    res.status(StatusCodes.OK).json({
      status: "success",
      data: status,
    });
  });
}
