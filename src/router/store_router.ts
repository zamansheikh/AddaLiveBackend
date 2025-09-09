import express from "express";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";
import StoreCategoryRepository from "../repository/store/store_category_repository";
import StoreCategoryModel from "../models/store/store_category_model";
import StoreService from "../services/store/store_service";
import StoreController from "../controllers/store_controller";
import StoreItemRepository from "../repository/store/store_item_repository";
import StoreItemModel from "../models/store/store_item_model";
import { upload } from "../core/middlewares/multer";

const router = express.Router();

const category = new StoreCategoryRepository(StoreCategoryModel);
const item = new StoreItemRepository(StoreItemModel);
const service = new StoreService(category, item);
const controller = new StoreController(service);

// 📌 store category
router
  .route("/categories")
  .post(authenticate([UserRoles.Admin]), controller.createCategory)
  .get(authenticate(), controller.getAllCategories);
router
  .route("/categories/:id")
  .get(authenticate(), controller.getCategoryById)
  .put(authenticate([UserRoles.Admin]), controller.updateCategory)
  .delete(authenticate([UserRoles.Admin]), controller.deleteCategory);

// 📌 store item
router.route("/items/single").post(authenticate([UserRoles.Admin]), upload.single("svgaFile"), controller.createStoreItemSingle);
router.route("/items/batch").post(authenticate([UserRoles.Admin]), upload.array("svgaFile", 10), controller.createStoreItemBatch);
router
  .route("/items/:id")
  .get(authenticate(), controller.getStoreItemById)
  .delete(authenticate([UserRoles.Admin]), controller.deleteStoreItem);
router.route("/items/single/:id").put(authenticate([UserRoles.Admin]), upload.single("svgaFile"),controller.updateStoreItemSingle)
router.route("/items/batch/:id").put(authenticate([UserRoles.Admin]), upload.array("svgaFile", 10),controller.updateStoreItemBatch)
router
  .route("/items/category/:category")
  .get(authenticate(), controller.getAllStoreItems)
  .put(authenticate([UserRoles.Admin]), controller.changeItemCategory);

export default router;
