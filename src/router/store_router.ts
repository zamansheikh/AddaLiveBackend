import express from "express";
import { authenticate } from "../core/middlewares/auth_middleware";
import { validateRequest } from "../core/middlewares/validate_request";
import { GrantItemDto } from "../dtos/store/grant_item_dto";
import { UserRoles } from "../core/Utils/enums";
import StoreCategoryRepository from "../repository/store/store_category_repository";
import StoreCategoryModel from "../models/store/store_category_model";
import StoreService from "../services/store/store_service";
import StoreController from "../controllers/store_controller";
import StoreItemRepository from "../repository/store/store_item_repository";
import StoreItemModel from "../models/store/store_item_model";
import { upload } from "../core/middlewares/multer";
import UserRepository from "../repository/users/user_repository";
import User from "../models/user/user_model";
import MyBucketRepository from "../repository/store/my_bucket_repository";
import MyBucketModel from "../models/store/my_bucket_model";
import UserStatsRepository from "../repository/users/userstats_repository";
import UserStats from "../models/userstats/userstats_model";

const router = express.Router();

const category = new StoreCategoryRepository(StoreCategoryModel);
const item = new StoreItemRepository(StoreItemModel);
const user = new UserRepository(User);
const stats = new UserStatsRepository(UserStats);
const bucket = new MyBucketRepository(MyBucketModel);
const service = new StoreService(category, item, user, stats, bucket);
const controller = new StoreController(service);

// 📌 store category
router
  .route("/categories")
  .post(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), controller.createCategory)
  .get(authenticate(), controller.getAllCategories);
router
  .route("/categories/:id")
  .get(authenticate(), controller.getCategoryById)
  .put(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), controller.updateCategory)
  .delete(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), controller.deleteCategory);
router
  .route("/categories/effected-items/:id")
  .get(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), controller.categoryDeleteEffectedItems);

// 📌 store item
router.route("/items/single").post(
  authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
  upload.fields([
    { name: "svgaFile", maxCount: 1 },
    { name: "previewFile", maxCount: 1 },
    { name: "logo", maxCount: 1 },
  ]),
  controller.createStoreItemSingle,
);
router.route("/items/batch").post(
  authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
  upload.fields([
    { name: "svgaFile", maxCount: 10 },
    { name: "previewFile", maxCount: 10 },
    { name: "logo", maxCount: 1 },
  ]),
  controller.createStoreItemBatch,
);
router
  .route("/items/effected-buckets/:itemId")
  .get(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), controller.getEffectedBucketSummary);
router.route("/items/vip").get(authenticate(), controller.getVIPStoreItems);
router.route("/items/svip").get(authenticate(), controller.getSVIPStoreItems);
router
  .route("/items/exclusive")
  .get(authenticate(), controller.getExlusiveStoreItems);
router.route("/items").get(authenticate(), controller.getAllStoreItems);
router
  .route("/items/:id")
  .get(authenticate(), controller.getStoreItemById)
  .delete(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), controller.deleteStoreItem);
router.route("/items/single/:id").put(
  authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
  upload.fields([
    { name: "svgaFile", maxCount: 1 },
    { name: "previewFile", maxCount: 1 },
    { name: "logo", maxCount: 1 },
  ]),
  controller.updateStoreItemSingle,
);
router
  .route("/items/batch/:id")
  .put(
    authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
    upload.fields([
      { name: "svgaFile", maxCount: 10 },
      { name: "previewFile", maxCount: 10 },
      { name: "logo", maxCount: 1 },
    ]),
    controller.updateStoreItemBatch,
  );
router
  .route("/items/category/:category")
  .get(authenticate(), controller.getStoreItemsByCategory)
  .put(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), controller.changeItemCategory);

// 📌 store privileges
router
  .route("/privileges")
  .get(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), controller.getPrivileges);

// 📌 the logged-in user's SVIP privileges + on/off toggles (SVIP Settings)
router.route("/privileges/my").get(authenticate(), controller.getMyPrivileges);
router.route("/privileges/my/toggle").put(authenticate(), controller.setMyPrivilege);

// 📌 grant item (admin only — exclusive items with canUserBuyThis: false)
router
  .route("/items/grant")
  .post(
    authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
    validateRequest(GrantItemDto),
    controller.grantStoreItem,
  );

// 📌 my buckets
router
  .route("/bucket")
  .post(authenticate(), controller.buyStoreItem)
  .put(authenticate(), controller.selectBucket)
  .get(authenticate(), controller.getMyBuckets);
router
  .route("/bucket/category/:category")
  .get(authenticate(), controller.getMyBucketByCategory);

export default router;
