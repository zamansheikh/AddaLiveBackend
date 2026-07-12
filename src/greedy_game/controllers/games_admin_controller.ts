import { StatusCodes } from "http-status-codes";
import catchAsync from "../../core/Utils/catch_async";
import AppError from "../../core/errors/app_errors";
import { IGamesClientService } from "../services/games_client_service";

export default class GamesAdminController {
  GamesClientService: IGamesClientService;

  constructor(GamesClientService: IGamesClientService) {
    this.GamesClientService = GamesClientService;
  }

  /**
   * GET /api/admin/game/reconciliation?from=&to=&gameKey=&cursor=&limit=
   *
   * Pulls the games backend's own record of every bet it settled through us, so
   * it can be diffed against `greedy_game_wallet_transactions`. Any debit present
   * on one side and not the other is a coin that moved without a round, or a round
   * that ran without a coin.
   */
  getReconciliation = catchAsync(async (req, res) => {
    const { from, to, gameKey, cursor, limit } = req.query;

    if (typeof from !== "string" || typeof to !== "string") {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "from and to are required ISO timestamps",
      );
    }

    const report = await this.GamesClientService.getReconciliation({
      from,
      to,
      gameKey: typeof gameKey === "string" ? gameKey : undefined,
      cursor: typeof cursor === "string" ? cursor : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Reconciliation report fetched",
      data: report,
    });
  });
}
