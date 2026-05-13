import { Request, Response } from "express";
import catchAsync from "../../core/Utils/catch_async";
import { IRocketConfigService } from "../../services/audio_room/rocket_config_service";
import AppError from "../../core/errors/app_errors";

/**
 * Controller for managing Rocket Configuration (Admin only).
 */
export class RocketConfigController {
  private service: IRocketConfigService;

  constructor(service: IRocketConfigService) {
    this.service = service;
  }

  /**
   * GET /api/admin/rocket-config
   * Retrieves the current rocket configuration from the DB.
   */
  getConfig = catchAsync(async (req: Request, res: Response) => {
    const config = await this.service.getConfig();
    res.status(200).json({
      status: "success",
      data: config,
    });
  });

  /**
   * POST /api/admin/rocket-config
   * Updates the rocket configuration and triggers an in-memory sync.
   */
  updateConfig = catchAsync(async (req: Request, res: Response) => {
    this.validateData(req.body);
    await this.service.updateConfig(req.body);
    res.status(200).json({
      status: "success",
      message: "Rocket configuration updated and synchronized successfully",
    });
  });

  /**
   * Validates the configuration data.
   */
  private validateData(data: any) {
    const { milestones, rewardNumbers, coinMin, coinMax, xpMin, xpMax } = data;

    if (!Array.isArray(milestones) || milestones.length === 0) {
      throw new AppError(400, "Milestones must be a non-empty array");
    }

    if (!Array.isArray(rewardNumbers) || rewardNumbers.length === 0) {
      throw new AppError(400, "Reward Numbers must be a non-empty array");
    }

    if (milestones.length !== rewardNumbers.length) {
      throw new AppError(400, "Milestones and Reward Numbers arrays must have the same length");
    }

    if (typeof coinMin !== "number" || typeof coinMax !== "number") {
      throw new AppError(400, "Coin Min and Max must be numbers");
    }

    if (coinMin > coinMax) {
      throw new AppError(400, "Coin Min cannot be greater than Coin Max");
    }

    if (typeof xpMin !== "number" || typeof xpMax !== "number") {
      throw new AppError(400, "XP Min and Max must be numbers");
    }

    if (xpMin > xpMax) {
      throw new AppError(400, "XP Min cannot be greater than XP Max");
    }
  }
}
