import { StatusCodes } from "http-status-codes";
import catchAsync from "../../core/Utils/catch_async";
import AppError from "../../core/errors/app_errors";
import { IGreedyGameService } from "../services/greedy_game_service";

export default class GreedyGameController {
  GreedyGameService: IGreedyGameService;

  constructor(GreedyGameService: IGreedyGameService) {
    this.GreedyGameService = GreedyGameService;
  }

  getWalletBalance = catchAsync(async (req, res) => {
    const { userId } = req.params;

    const balance = await this.GreedyGameService.getUserBalance(userId);

    res.status(200).json(balance);
  });

  debit = catchAsync(async (req, res) => {
    const { userId, currency, amount, type, idempotencyKey, description, refType, refId } = req.body;

    if (!userId || !currency || !amount || !type || !idempotencyKey || !description || !refType || !refId) {
      throw new AppError(StatusCodes.BAD_REQUEST, "All fields are required");
    }

    const allowedTypes = ["game_bet", "game_payout", "refund"];
    if (!allowedTypes.includes(type)) {
      throw new AppError(StatusCodes.BAD_REQUEST, `Invalid type. Allowed values: ${allowedTypes.join(", ")}`);
    }

    const result = await this.GreedyGameService.debit({
      userId,
      currency,
      amount,
      type,
      idempotencyKey,
      description,
      refType,
      refId,
    });

    res.status(result.status).json(result.body);
  });

  credit = catchAsync(async (req, res) => {
    const { userId, currency, amount, type, idempotencyKey, description, refType, refId } = req.body;

    if (!userId || !currency || !amount || !type || !idempotencyKey || !description || !refType || !refId) {
      throw new AppError(StatusCodes.BAD_REQUEST, "All fields are required");
    }

    const allowedTypes = ["game_bet", "game_payout", "refund"];
    if (!allowedTypes.includes(type)) {
      throw new AppError(StatusCodes.BAD_REQUEST, `Invalid type. Allowed values: ${allowedTypes.join(", ")}`);
    }

    const result = await this.GreedyGameService.credit({
      userId,
      currency,
      amount,
      type,
      idempotencyKey,
      description,
      refType,
      refId,
    });

    res.status(result.status).json(result.body);
  });
}
