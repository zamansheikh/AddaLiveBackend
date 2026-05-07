import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";

export function validateCreateStoreItem(body: any) {
  const { name, validity, categoryId, price } = body;
  if (!name || !validity || !categoryId || !price)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "name, validity, categoryId, price are required",
    );
  validateNumber(validity, "validity");
  validateNumber(price, "price");
}
export function validateUpdateStoreItem(body: any) {
  const { name, categoryId, prices } = body;
  if (!name && !categoryId && !prices)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "name, categoryId, prices at least one is required",
    );
  if (prices) {
    validatePrices(prices);
  }
}

export function ValidateStoreItemBatch(
  body: any,
  files: {
    svgaFile?: Express.Multer.File[];
    previewFile?: Express.Multer.File[];
    logo?: Express.Multer.File[];
  },
) {
  const { name, categoryId, prices, categoryNames, privilege } = body;
  if (!name || !categoryId || !prices)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "name, categoryId, prices, privilege are required",
    );
  if (privilege) {
    validateArray(privilege, "privilege");
  }

  //check if prices is the right type of IPrices
  validatePrices(prices);

  const nameParts = name.split("-");
  if (nameParts[0] === "VIP" || nameParts[0] === "SVIP") {
    if (nameParts.length !== 2 || isNaN(Number(nameParts[1]))) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "VIP or SVIP names must include a valid numeric level suffix, e.g., VIP-1 or SVIP-3",
      );
    }
  }

  // svgaFile and previewFile are each independently optional — but a bundle
  // must include at least one asset per category, so require at least one
  // of the two arrays to match the categoryNames count exactly.
  const { svgaFile, previewFile } = files;
  const svgaCount = svgaFile?.length ?? 0;
  const previewCount = previewFile?.length ?? 0;
  if (svgaCount < 1 && previewCount < 1)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Each bundle category needs at least one of svgaFile or previewFile",
    );

  const categories = categoryNames.split(",");
  if (svgaCount > 0 && categories.length !== svgaCount)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "categoryNames and svgaFiles must be the same length when svgaFiles are provided",
    );
  if (previewCount > 0 && categories.length !== previewCount)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "categoryNames and previewFiles must be the same length when previewFiles are provided",
    );
}

export function ValidateStoreItemUpdateBatch(
  body: any,
  files: {
    svgaFile?: Express.Multer.File[];
    previewFile?: Express.Multer.File[];
    logo?: Express.Multer.File[];
  },
) {
  const { name, categoryId, prices, categoryNames, privilege } = body;
  if (!name && !categoryId && !prices)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "name, categoryId, prices at least one is required",
    );
  if (privilege) {
    validateArray(privilege, "privilege");
  }
  if (prices) {
    validatePrices(prices);
  }

  const { svgaFile, previewFile } = files;

  if (svgaFile && svgaFile.length != 0 && !categoryNames)
    throw new AppError(StatusCodes.BAD_REQUEST, "categoryNames are required");

  if (categoryNames) {
    const categories = categoryNames.split(",");
    if (svgaFile && categories.length !== svgaFile.length)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "categoryNames and svgaFiles must be the same length",
      );
    if (previewFile && categories.length !== previewFile.length)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "categoryNames and previewFiles must be the same length",
      );
  }
}

export function validateArray(arr: any, fieldName: string) {
  let parsedArr = arr;
  if (typeof arr === "string") {
    try {
      parsedArr = JSON.parse(arr);
    } catch (error) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `${fieldName} must be a valid JSON string or array`,
      );
    }
  }

  if (!Array.isArray(parsedArr))
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `${fieldName} must be an array`,
    );
  if (parsedArr.length < 1)
    throw new AppError(StatusCodes.BAD_REQUEST, `${fieldName} cannot be empty`);
}

export function validateNumberArray(arr: any, fieldName: string) {
  let parsedArr = arr;
  if (typeof arr === "string") {
    try {
      parsedArr = JSON.parse(arr);
    } catch (error) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `${fieldName} must be a valid JSON string or array`,
      );
    }
  }

  if (!Array.isArray(parsedArr))
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `${fieldName} must be an array`,
    );
  if (parsedArr.length < 1)
    throw new AppError(StatusCodes.BAD_REQUEST, `${fieldName} cannot be empty`);
  parsedArr.forEach((item: any) => {
    validateNumber(item, fieldName);
  });
}

export function validateNumber(num: any, fieldName: string) {
  if (isNaN(Number(num)))
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `${fieldName} must be a number`,
    );
  if (Number(num) < 0)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `${fieldName} must be a positive number`,
    );
}

export function validatePrices(prices: any) {
  let parsedPrices = prices;
  if (typeof prices === "string") {
    try {
      parsedPrices = JSON.parse(prices);
    } catch (error) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "prices must be a valid JSON string or array",
      );
    }
  }

  if (!Array.isArray(parsedPrices)) {
    throw new AppError(StatusCodes.BAD_REQUEST, "prices must be an array");
  }

  parsedPrices.forEach((p: any) => {
    if (typeof p !== "object" || p === null) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Each price item must be an object",
      );
    }
    if (p.validity === undefined || p.price === undefined) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Each price must have validity and price",
      );
    }
    validateNumber(p.validity, "validity");
    validateNumber(p.price, "price");
  });
}
