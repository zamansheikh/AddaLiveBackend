import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";

export function validateCreateStoreItem(body: any) {
  const { name, validity, categoryId, price } = body;
  if (!name || !validity || !categoryId || !price)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "name, validity, categoryId, price are required"
    );
  validateNumber(validity, "validity");
  validateNumber(price, "price");
}
export function validateUpdateStoreItem(body: any) {
  const { name, validity, categoryId, price } = body;
  if (!name && !validity && !categoryId && !price)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "name, validity, categoryId, price at least one is required"
    );
  if (validity) validateNumber(validity, "validity");
  if (price) validateNumber(price, "price");
}

export function ValidateStoreItemBatch(
  body: any,
  files: Express.Multer.File[]
) {
  const { name, validity, categoryId, price, categoryNames } = body;
  if (!name || !validity || !categoryId || !price)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "name, validity, categoryId, price are required"
    );
  validateNumber(validity, "validity");
  validateNumber(price, "price");

  if (!files || files.length < 1)
    throw new AppError(StatusCodes.BAD_REQUEST, "files are required");
  const categories = categoryNames.split(",");
  if (categories.length !== files.length)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "categoryNames and files must be the same length"
    );
}

export function ValidateStoreItemUpdateBatch(
  body: any,
  files: Express.Multer.File[]
) {
  const { name, validity, categoryId, price, categoryNames } = body;
  if (!name && !validity && !categoryId && !price)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "name, validity, categoryId, price are required"
    );
  if (validity) validateNumber(validity, "validity");
  if (price) validateNumber(price, "price");
  if(files && files.length != 0 && !categoryNames) throw new AppError(StatusCodes.BAD_REQUEST, "categoryNames are required");
  if (categoryNames) {
    const categories = categoryNames.split(",");
    if (categories.length !== files.length)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "categoryNames and files must be the same length"
      );
  }
}

export function validateArray(arr: any) {
  if (!Array.isArray(arr))
    throw new AppError(StatusCodes.BAD_REQUEST, "Invalid array provided");
  if (arr.length < 1)
    throw new AppError(StatusCodes.BAD_REQUEST, "Array cannot be empty");
}

export function validateNumber(num: any, filedName: string) {
  if (isNaN(Number(num)))
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `${filedName} must be a number`
    );
  if (num < 0)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `${filedName} must be a number`
    );
}
