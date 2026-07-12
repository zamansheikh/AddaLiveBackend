import { ErrorRequestHandler } from "express";
import AppError from "../../core/errors/app_errors";
import GamesApiError from "../errors/games_api_error";

/**
 * Error envelope for `/internal/*` only. Mounted on the internal router so it
 * runs BEFORE the app-wide `globalErrorHandler`, which speaks a different shape
 * (`{ success, message, errorSources }`) that the games backend cannot read.
 *
 * The status code is the contract, and it decides money:
 *
 *   2xx → games concludes the coins MOVED
 *   4xx → games concludes the coins DEFINITELY DID NOT move; it gives up and
 *         tells the player, and never asks again
 *   5xx → games concludes the outcome is UNKNOWN and reconciles later via
 *         GET /internal/wallet/transaction/:idempotencyKey
 *
 * So an *unrecognised* error must be a 500. The global handler turns a Mongo
 * duplicate-key (11000) into a 400 — if that reached the games backend after a
 * debit had actually committed, the stake would be silently lost. Anything we
 * have not deliberately classified is therefore reported as UNKNOWN.
 */
const internalErrorHandler: ErrorRequestHandler = (err, req, res, next): any => {
  if (res.headersSent) return next(err);

  if (err instanceof GamesApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details === undefined ? {} : { details: err.details }),
      },
    });
  }

  if (err instanceof AppError && err.statusCode < 500) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: "BAD_REQUEST", message: err.message },
    });
  }

  console.error(
    `[games:internal] ${req.method} ${req.originalUrl} — unhandled:`,
    err instanceof Error ? err.stack || err.message : err,
  );

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal error — outcome unknown, please reconcile",
    },
  });
};

export default internalErrorHandler;
