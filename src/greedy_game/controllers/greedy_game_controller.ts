import { StatusCodes } from "http-status-codes";
import catchAsync from "../../core/Utils/catch_async";
import GamesApiError from "../errors/games_api_error";
import { IGreedyGameService } from "../services/greedy_game_service";

/**
 * Transport for the games provider contract. Deliberately thin: every rule that
 * decides whether money may move lives in `GreedyGameService`, so there is one
 * place to read when auditing the ledger.
 */
export default class GreedyGameController {
  GreedyGameService: IGreedyGameService;

  constructor(GreedyGameService: IGreedyGameService) {
    this.GreedyGameService = GreedyGameService;
  }

  getWalletBalance = catchAsync(async (req, res) => {
    const { userId } = req.params;

    const balance = await this.GreedyGameService.getUserBalance(userId);

    res.status(StatusCodes.OK).json(balance);
  });

  debit = catchAsync(async (req, res) => {
    const result = await this.GreedyGameService.debit(req.body);

    res.status(result.status).json(result.body);
  });

  credit = catchAsync(async (req, res) => {
    const result = await this.GreedyGameService.credit(req.body);

    res.status(result.status).json(result.body);
  });

  getTransaction = catchAsync(async (req, res) => {
    const { idempotencyKey } = req.params;

    const result = await this.GreedyGameService.getTransactionByidempotencyKey(
      idempotencyKey,
    );

    res.status(result.status).json(result.body);
  });

  lookupTransactions = catchAsync(async (req, res) => {
    const { txnIds } = req.body;

    if (!Array.isArray(txnIds)) {
      throw new GamesApiError(
        StatusCodes.BAD_REQUEST,
        "INVALID_REQUEST",
        "txnIds must be an array",
      );
    }
    if (txnIds.length > 500) {
      throw new GamesApiError(
        StatusCodes.BAD_REQUEST,
        "INVALID_REQUEST",
        "txnIds may contain at most 500 ids",
      );
    }

    const result = await this.GreedyGameService.lookupTransactions(txnIds);

    res.status(result.status).json(result.body);
  });

  getUserNames = catchAsync(async (req, res) => {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new GamesApiError(
        StatusCodes.BAD_REQUEST,
        "INVALID_REQUEST",
        "userIds must be a non-empty array",
      );
    }

    const result = await this.GreedyGameService.getUserNames(userIds);

    res.status(result.status).json(result.body);
  });

  searchUsers = catchAsync(async (req, res) => {
    const { query } = req.body;

    if (typeof query !== "string" || !query.trim()) {
      throw new GamesApiError(
        StatusCodes.BAD_REQUEST,
        "INVALID_REQUEST",
        "query must be a non-empty string",
      );
    }

    const result = await this.GreedyGameService.searchUsers(query);

    res.status(result.status).json(result.body);
  });
}
