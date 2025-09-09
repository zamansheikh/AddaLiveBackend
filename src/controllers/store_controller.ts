import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import { IPremiumFiles, IStoreService } from "../services/store/store_service";
import sendResponse from "../core/Utils/send_response";
import { validateFieldExistance } from "../core/Utils/helper_functions";
import {
  validateCreateStoreItem,
  ValidateStoreItemBatch,
  ValidateStoreItemUpdateBatch,
  validateUpdateStoreItem,
} from "../dtos/sotre/store_validators";

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

  // 📌 store items
  createStoreItemSingle = catchAsync(async (req: Request, res: Response) => {
    validateCreateStoreItem(req.body);
    const file = req.file;
    validateFieldExistance(file, "file");
    const { name, validity, categoryId, price } = req.body;
    const item = await this.Service.createStoreItemSingle(
      { name, validity, categoryId, price },
      file!
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: item,
    });
  });
  createStoreItemBatch = catchAsync(async (req: Request, res: Response) => {
    ValidateStoreItemBatch(req.body, req.files as Express.Multer.File[]);
    const { name, validity, categoryId, price, categoryNames } = req.body;
    const files = req.files as Express.Multer.File[];
    let categories = categoryNames.split(",");
    categories = categories.map((cat: string) => cat.trim());
    let premiumFiles: IPremiumFiles[] = [];
    for (let i = 0; i < files.length; i++) {
      premiumFiles.push({
        categoryName: categories[i],
        svgaFile: files[i],
      });
    }
    const item = await this.Service.createStoreItemBatch(
      { name, validity, categoryId, price },
      premiumFiles
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

  getAllStoreItems = catchAsync(async (req: Request, res: Response) => {
    const { category } = req.params;
    const { query } = req;
    validateFieldExistance(category, "categoryId");
    const items = await this.Service.getAllStoreItems(category, query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: items,
    });
  });

  updateStoreItemSingle = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateFieldExistance(id, "_id");
    validateUpdateStoreItem(req.body);
    const { name, validity, categoryId, price } = req.body;
    const item = await this.Service.updateStoreItemSingle(
      id,
      { name, validity, categoryId, price },
      req.file as Express.Multer.File
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
    ValidateStoreItemUpdateBatch(req.body, req.files as Express.Multer.File[]);
    const { name, validity, categoryId, price, categoryNames } = req.body;
    let premiumFiles: IPremiumFiles[] = [];
    
    if (categoryNames) {
      let names = categoryNames.split(",");
      names = names.map((cat: string) => cat.trim());
      const files = req.files as Express.Multer.File[];
      for (let i = 0; i < files.length; i++) {
        premiumFiles.push({
          categoryName: names[i],
          svgaFile: files[i],
        });
      }
    }

    const item = await this.Service.updateStoreItemBatch(
      id,
      { name, validity, categoryId, price },
      premiumFiles
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: item,
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
  
  changeItemCategory  = catchAsync(async (req: Request, res: Response) => {
    const {category} = req.params;
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
  
}
