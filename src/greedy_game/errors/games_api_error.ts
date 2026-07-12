import AppError from "../../core/errors/app_errors";

/**
 * An error carrying the machine-readable `code` the games backend switches on
 * (INSUFFICIENT_BALANCE, WALLET_FROZEN, USER_NOT_FOUND, …).
 *
 * Status choice is a money decision, not a cosmetic one — see
 * `internal_error_handler.ts`.
 */
export default class GamesApiError extends AppError {
  public code: string;
  public details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(statusCode, message);
    this.code = code;
    this.details = details;
  }
}
