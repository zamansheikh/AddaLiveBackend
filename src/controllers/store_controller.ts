import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import { IPremiumFiles, IStoreService } from "../services/store/store_service";
import sendResponse from "../core/Utils/send_response";
import {
  isImageFile,
  isSvgaFile,
  validateFieldExistance,
} from "../core/Utils/helper_functions";
import { StatusCodes } from "http-status-codes";
import AppError from "../core/errors/app_errors";
import {
  validateCreateStoreItem,
  ValidateStoreItemBatch,
  ValidateStoreItemUpdateBatch,
  validateUpdateStoreItem,
} from "../dtos/sotre/store_validators";
import PrivilegeService from "../services/store/privilege_service";

/**
 * Parse the comma-separated "1"/"0" presence mask sent by the admin client
 * into a boolean[] indexed by category position. When the client doesn't
 * send a mask (legacy callers), fall back to the contract that one file
 * was sent per category — i.e. every slot present.
 *
 * The validator already enforced shape (mask length === categoryCount and
 * 1-count === fileCount), so the result is safe to use directly.
 */
function parseBundleFlags(
  rawFlags: unknown,
  categoryCount: number,
  fileCount: number,
): boolean[] {
  if (typeof rawFlags === "string" && rawFlags.length > 0) {
    return rawFlags.split(",").map((f) => f === "1");
  }
  // Legacy fallback: if the client sent N files for N categories, every
  // slot is present. If counts mismatch, mark only the first `fileCount`
  // slots so we don't dereference past the end of the file array.
  return Array.from({ length: categoryCount }, (_, i) =>
    fileCount === categoryCount ? true : i < fileCount,
  );
}

export default class StoreController {
  Service: IStoreService;
  constructor(service: IStoreService) {
    this.Service = service;
  }

  //   📌 store categories
  createCategory = catchAsync(async (req: Request, res: Response) => {
    const { title } = req.body;
    validateFieldExistance(title, "title");
    const category = await this.Service.createCategory(title);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: category,
    });
  });

  updateCategory = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title } = req.body;
    validateFieldExistance(title, "title");
    validateFieldExistance(id, "_id");
    const category = await this.Service.updateCategory(id, title);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: category,
    });
  });

  getAllCategories = catchAsync(async (req: Request, res: Response) => {
    const categories = await this.Service.getAllCategories();
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: categories,
    });
  });

  getCategoryById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateFieldExistance(id, "_id");
    const category = await this.Service.getCategoryById(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: category,
    });
  });

  deleteCategory = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateFieldExistance(id, "_id");
    const category = await this.Service.deleteCategory(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: category,
    });
  });

  categoryDeleteEffectedItems = catchAsync(
    async (req: Request, res: Response) => {
      const { id } = req.params;
      validateFieldExistance(id, "_id");
      const items = await this.Service.categoryDeleteEffectedItems(id);
      sendResponse(res, {
        statusCode: 200,
        success: true,
        result: items,
      });
    },
  );

  // 📌 store items
  createStoreItemSingle = catchAsync(async (req: Request, res: Response) => {
    if (typeof req.body.privilege === "string") {
      req.body.privilege = JSON.parse(req.body.privilege);
    }
    const { name, validity, categoryId, price, privilege, canUserBuyThis } =
      req.body;

    validateCreateStoreItem(req.body);

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const svgaFile = files["svgaFile"]?.[0];
    const previewFile = files["previewFile"]?.[0];
    const logoFile = files["logo"]?.[0];

    // validateFieldExistance(svgaFile, "svgaFile");
    // validateFieldExistance(previewFile, "previewFile");

    if (logoFile && !isImageFile(logoFile.originalname)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "logo must be an image");
    }

    if (svgaFile && !isSvgaFile(svgaFile.originalname)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "svgaFile must be a .svga file",
      );
    }
    if (previewFile && !isImageFile(previewFile.originalname)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "previewFile must be an image",
      );
    }

    const item = await this.Service.createStoreItemSingle(
      {
        name,
        categoryId,
        prices: [{ validity, price }],
        privilege,
        canUserBuyThis,
      },
      svgaFile,
      previewFile,
      logoFile,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: item,
    });
  });

  createStoreItemBatch = catchAsync(async (req: Request, res: Response) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (typeof req.body.prices === "string") {
      req.body.prices = JSON.parse(req.body.prices);
    }
    if (typeof req.body.privilege === "string") {
      req.body.privilege = JSON.parse(req.body.privilege);
    }
    const { name, categoryId, prices, categoryNames, privilege } = req.body;

    ValidateStoreItemBatch(req.body, files);

    const svgaFiles = files["svgaFile"] || [];
    const previewFiles = files["previewFile"] || [];
    const logoFile = files["logo"]?.[0];

    let categories = categoryNames.split(",");
    categories = categories.map((cat: string) => cat.trim());
    const svgaPresence = parseBundleFlags(
      req.body.svgaFlags,
      categories.length,
      svgaFiles.length,
    );
    const previewPresence = parseBundleFlags(
      req.body.previewFlags,
      categories.length,
      previewFiles.length,
    );
    let premiumFiles: IPremiumFiles[] = [];
    let svgaCursor = 0;
    let previewCursor = 0;
    for (let i = 0; i < categories.length; i++) {
      const svga = svgaPresence[i] ? svgaFiles[svgaCursor++] : undefined;
      const preview = previewPresence[i]
        ? previewFiles[previewCursor++]
        : undefined;
      if (svga && !isSvgaFile(svga.originalname)) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `svgaFile[${i}] must be a .svga file`,
        );
      }
      if (preview && !isImageFile(preview.originalname)) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `previewFile[${i}] must be an image`,
        );
      }
      if (!svga && !preview) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `category[${i}] (${categories[i]}) needs at least one of svgaFile or previewFile`,
        );
      }
      premiumFiles.push({
        categoryName: categories[i],
        svgaFile: svga,
        previewFile: preview,
      });
    }

    if (logoFile && !isImageFile(logoFile.originalname)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "logo must be an image");
    }
    const item = await this.Service.createStoreItemBatch(
      { name, categoryId, prices, privilege },
      premiumFiles,
      logoFile,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: item,
    });
  });

  getStoreItemById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateFieldExistance(id, "_id");
    const item = await this.Service.getStoreItemById(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: item,
    });
  });

  getVIPStoreItems = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const items = await this.Service.getVIPStoreItems(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: items,
    });
  });

  getSVIPStoreItems = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const items = await this.Service.getSVIPStoreItems(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: items,
    });
  });

  getExlusiveStoreItems = catchAsync(async (req: Request, res: Response) => {
    const items = await this.Service.getExlusiveStoreItems();
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: items,
    });
  });

  getAllStoreItems = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const items = await this.Service.getAllStoreItems(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: items,
    });
  });

  getStoreItemsByCategory = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { category } = req.params;
    const { query } = req;
    validateFieldExistance(category, "categoryId");
    const items = await this.Service.getStoreItemsByCategory(
      category,
      query,
      id,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: items,
    });
  });

  updateStoreItemSingle = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateFieldExistance(id, "_id");
    if (typeof req.body.prices === "string") {
      req.body.prices = JSON.parse(req.body.prices);
    }

    if (typeof req.body.privilege === "string") {
      req.body.privilege = JSON.parse(req.body.privilege);
    }
    const { name, categoryId, prices, privilege, canUserBuyThis } = req.body;
    validateUpdateStoreItem(req.body);

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const svgaFile = files?.["svgaFile"]?.[0];
    const previewFile = files?.["previewFile"]?.[0];
    const logoFile = files?.["logo"]?.[0];

    if (svgaFile && !isSvgaFile(svgaFile.originalname)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "svgaFile must be a .svga file",
      );
    }
    if (previewFile && !isImageFile(previewFile.originalname)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "previewFile must be an image",
      );
    }
    if (logoFile && !isImageFile(logoFile.originalname)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "logo must be an image");
    }

    const item = await this.Service.updateStoreItemSingle(
      id,
      { name, categoryId, prices, privilege, canUserBuyThis },
      svgaFile,
      previewFile,
      logoFile,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: item,
    });
  });

  updateStoreItemBatch = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateFieldExistance(id, "_id");
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (typeof req.body.prices === "string") {
      req.body.prices = JSON.parse(req.body.prices);
    }
    if (typeof req.body.privilege === "string") {
      req.body.privilege = JSON.parse(req.body.privilege);
    }
    const { name, categoryId, prices, categoryNames, privilege } = req.body;
    ValidateStoreItemUpdateBatch(req.body, files);

    let premiumFiles: IPremiumFiles[] = [];
    const logoFile = files?.["logo"]?.[0];

    if (logoFile && !isImageFile(logoFile.originalname)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "logo must be an image");
    }

    if (categoryNames) {
      let names = categoryNames.split(",");
      names = names.map((cat: string) => cat.trim());
      const svgaFiles = files["svgaFile"] || [];
      const previewFiles = files["previewFile"] || [];
      const svgaPresence = parseBundleFlags(
        req.body.svgaFlags,
        names.length,
        svgaFiles.length,
      );
      const previewPresence = parseBundleFlags(
        req.body.previewFlags,
        names.length,
        previewFiles.length,
      );
      let svgaCursor = 0;
      let previewCursor = 0;
      for (let i = 0; i < names.length; i++) {
        const svga = svgaPresence[i] ? svgaFiles[svgaCursor++] : undefined;
        const preview = previewPresence[i]
          ? previewFiles[previewCursor++]
          : undefined;
        if (svga && !isSvgaFile(svga.originalname)) {
          throw new AppError(
            StatusCodes.BAD_REQUEST,
            `svgaFile[${i}] must be a .svga file`,
          );
        }
        if (preview && !isImageFile(preview.originalname)) {
          throw new AppError(
            StatusCodes.BAD_REQUEST,
            `previewFile[${i}] must be an image`,
          );
        }
        if (!svga && !preview) {
          throw new AppError(
            StatusCodes.BAD_REQUEST,
            `category[${i}] (${names[i]}) needs at least one of svgaFile or previewFile`,
          );
        }
        premiumFiles.push({
          categoryName: names[i],
          svgaFile: svga,
          previewFile: preview,
        });
      }
    }

    const item = await this.Service.updateStoreItemBatch(
      id,
      { name, categoryId, prices, privilege },
      premiumFiles,
      logoFile,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: item,
    });
  });

  getEffectedBucketSummary = catchAsync(async (req: Request, res: Response) => {
    const { itemId } = req.params;
    validateFieldExistance(itemId, "itemId");
    const summary = await this.Service.getEffectedBucketSummary(itemId);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: summary,
    });
  });

  deleteStoreItem = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateFieldExistance(id, "_id");
    const item = await this.Service.deleteStoreItem(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: item,
    });
  });

  changeItemCategory = catchAsync(async (req: Request, res: Response) => {
    const { category } = req.params;
    const { itemId } = req.body;
    validateFieldExistance(itemId, "itemId");
    validateFieldExistance(category, "category");
    const item = await this.Service.changeItemCategory(itemId, category);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: item,
    });
  });

  //  📌 my buckets

  grantStoreItem = catchAsync(async (req: Request, res: Response) => {
    const { userId, itemId, validity } = req.body;
    const bucket = await this.Service.grantItemToUser(
      userId,
      itemId,
      validity,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: bucket,
    });
  });

  buyStoreItem = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { itemId, priceIndex } = req.body;
    validateFieldExistance(itemId, "itemId");
    const item = await this.Service.buyStoreItem(
      id,
      itemId,
      priceIndex ? Number(priceIndex) : 0,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: item,
    });
  });

  getMyBucketByCategory = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { category } = req.params;
    validateFieldExistance(category, "category");
    const items = await this.Service.getMyBucketByCategory(
      id,
      category,
      req.query,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: items,
    });
  });

  getMyBuckets = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const buckets = await this.Service.getMyBuckets(id, req.query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: buckets,
    });
  });

  selectBucket = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { bucketId } = req.body;
    validateFieldExistance(bucketId, "bucketId");
    const item = await this.Service.selectBucket(id, bucketId);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: item,
    });
  });

  getPrivileges = catchAsync(async (req: Request, res: Response) => {
    const privileges = await PrivilegeService.getInstance().getPrivilages();
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: privileges,
    });
  });
}
