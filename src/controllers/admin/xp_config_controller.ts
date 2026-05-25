import { Request, Response } from "express";
import catchAsync from "../../core/Utils/catch_async";
import { XpConfigService } from "../../services/admin/xp_config_service";
import AppError from "../../core/errors/app_errors";

/**
 * Controller for managing XP Configuration (Admin only).
 *
 * Calls the fully static XpConfigService directly — no dependency injection needed.
 */
export class XpConfigController {
  /**
   * GET /api/admin/xp-config
   * Retrieves the current XP configuration (levels, gift→XP conversion, SVIP multipliers).
   */
  getConfig = catchAsync(async (req: Request, res: Response) => {
    const config = await XpConfigService.getConfig();
    res.status(200).json({
      status: "success",
      data: config,
    });
  });

  /**
   * POST /api/admin/xp-config
   * Updates the XP configuration and immediately refreshes the in-memory cache.
   */
  updateConfig = catchAsync(async (req: Request, res: Response) => {
    this.validateData(req.body);
    const updated = await XpConfigService.updateConfig(req.body);
    res.status(200).json({
      status: "success",
      message: "XP Configuration updated and cache synchronized successfully",
      data: updated,
    });
  });

  /**
   * Validates the XP configuration data from the admin request body.
   */
  private validateData(data: any) {
    const { xpLevels, giftSendXp, svipMultipliers } = data;

    if (xpLevels === undefined && giftSendXp === undefined && svipMultipliers === undefined) {
      throw new AppError(
        400,
        "At least one field is required: xpLevels, giftSendXp, or svipMultipliers",
      );
    }

    if (xpLevels !== undefined) {
      if (!Array.isArray(xpLevels) || xpLevels.length === 0) {
        throw new AppError(400, "xpLevels must be a non-empty array of numbers");
      }
      if (!xpLevels.every((lvl: any) => typeof lvl === "number" && lvl > 0)) {
        throw new AppError(400, "Each xpLevel must be a positive number");
      }

      // Ensure strictly ascending (each level's threshold must be greater than the previous)
      for (let i = 1; i < xpLevels.length; i++) {
        if (xpLevels[i] <= xpLevels[i - 1]) {
          throw new AppError(
            400,
            `xpLevels must be strictly ascending. Level ${i} (${xpLevels[i]}) is not greater than level ${i - 1} (${xpLevels[i - 1]})`,
          );
        }
      }
    }

    if (giftSendXp !== undefined) {
      if (typeof giftSendXp !== "number" || giftSendXp <= 0) {
        throw new AppError(400, "giftSendXp must be a positive number");
      }
    }

    if (svipMultipliers !== undefined) {
      if (!Array.isArray(svipMultipliers) || svipMultipliers.length === 0) {
        throw new AppError(400, "svipMultipliers must be a non-empty array");
      }

      const sorted = [...svipMultipliers].sort(
        (a, b) => a.minLevel - b.minLevel,
      );
      for (let i = 0; i < sorted.length; i++) {
        const tier = sorted[i];
        if (typeof tier.minLevel !== "number" || tier.minLevel < 0) {
          throw new AppError(400, "Each svipMultiplier must have a non-negative minLevel");
        }
        if (typeof tier.multiplier !== "number" || tier.multiplier <= 0) {
          throw new AppError(400, "Each svipMultiplier must have a positive multiplier");
        }
      }
    }
  }
}
