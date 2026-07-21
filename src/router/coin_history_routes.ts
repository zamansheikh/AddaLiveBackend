import express, { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import CoinHistoryRepository from "../repository/coins/coinHistoryRepository";
import CoinHistoryModel from "../models/coins/coinHistoryModel";
import { authenticate } from "../core/middlewares/auth_middleware";
import catchAsync from "../core/Utils/catch_async";
import sendResponse from "../core/Utils/send_response";

const router = express.Router();

const coinHistoryRepository = new CoinHistoryRepository(CoinHistoryModel);

/**
 * GET /api/coin-history/my-recharge
 * The logged-in user's recharge history — every coin transfer received (from a
 * reseller / admin). Paginated via ?page & ?limit. Records older than 30 days
 * are auto-pruned by the CoinHistory TTL index.
 */
router.get(
  "/my-recharge",
  authenticate(),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const result = await coinHistoryRepository.getReceiverHistory(
      id,
      req.query as Record<string, unknown>,
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result,
      message: "Recharge history retrieved successfully",
    });
  }),
);

export default router;
