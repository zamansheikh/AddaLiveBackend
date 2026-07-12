import { StatusCodes } from "http-status-codes";
import catchAsync from "../../core/Utils/catch_async";
import AppError from "../../core/errors/app_errors";
import { IGameSessionService } from "../services/game_session_service";

export default class GameSessionController {
  GameSessionService: IGameSessionService;

  constructor(GameSessionService: IGameSessionService) {
    this.GameSessionService = GameSessionService;
  }

  /** POST /api/game/session/token — exchange an Adda login for a game session. */
  mintPlayerToken = catchAsync(async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Not authenticated");
    }

    const session = await this.GameSessionService.mintPlayerToken(userId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Game session token issued",
      data: session,
    });
  });
}
