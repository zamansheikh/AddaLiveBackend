import catchAsync from "../../core/Utils/catch_async";
import sendResponse from "../../core/Utils/send_response";
import { IAgoraStatsService } from "../../services/agora/agora_stats_service";

/**
 * Admin-only read/reset of Agora request statistics. Counts are recorded by the
 * public token controller when RTC/RTM tokens are generated.
 */
export class AgoraStatsController {
  private service: IAgoraStatsService;

  constructor(service: IAgoraStatsService) {
    this.service = service;
  }

  getStats = catchAsync(async (_req, res) => {
    const stats = await this.service.getStats();
    sendResponse(res, {
      success: true,
      statusCode: 200,
      result: stats,
    });
  });

  reset = catchAsync(async (_req, res) => {
    const stats = await this.service.reset();
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Statistics reset successfully",
      result: stats,
    });
  });
}
