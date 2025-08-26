import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";

export function validateCreateSalary(body: Record<string, unknown>) {
  const { diamondCount, moneyCount, country } = body;
  if (!diamondCount)
    throw new AppError(StatusCodes.BAD_REQUEST, "Diamond count is required");
  if (isNaN(Number(diamondCount)))
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Diamond count must be a number"
    );
  if (isNaN(Number(moneyCount)))
    throw new AppError(StatusCodes.BAD_REQUEST, "Money count must be a number");
  if (!moneyCount)
    throw new AppError(StatusCodes.BAD_REQUEST, "Money count is required");
  if (!country)
    throw new AppError(StatusCodes.BAD_REQUEST, "Country is required");
}
