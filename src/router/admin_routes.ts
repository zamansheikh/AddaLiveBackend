import express from "express";
import UserRepository from "../repository/user_repository";
import User from "../models/user/user_model";
import AdminUserService from "../services/admin/admin_user_service";
import AdminUserController from "../controllers/admin/admin_user_controller";
import { ActivityZoneUpdateDto } from "../dtos/admin/activityzone_update_dto";
import { validateRequest } from "../core/middlewares/validate_request";
import { UpdateStatDto } from "../dtos/admin/update_state_dto";
import UserStatsRepository from "../repository/userstats/userstats_repository";
import UserStats from "../models/userstats/userstats_model";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";
import AdminRepository from "../repository/admin/admin_repository";
import Admin from "../models/admin/admin_model";
import { CreateGiftDto } from "../dtos/admin/create_gift_dto";
import multer from "multer";
import { upload } from "../core/middlewares/multer";
import { GiftRepository } from "../repository/gifts/gifts_repositories";
import Gifts from "../models/gifts/gifts_model";

const router = express.Router();

const userRepository = new UserRepository(User);
const userStatsRepository = new UserStatsRepository(UserStats);
const adminRepository = new AdminRepository(Admin);
const giftRepository = new GiftRepository(Gifts);

const adminUserService = new AdminUserService(
  userRepository,
  userStatsRepository,
  adminRepository,
  giftRepository
);
const adminUserController = new AdminUserController(adminUserService);

router
  .route("/auth")
  .post(adminUserController.registerAdmin)
  .put(authenticate([UserRoles.Admin]), adminUserController.updateAdmin)
  .delete(authenticate([UserRoles.Admin]), adminUserController.deleteAdmin);

router.route("/login").post(adminUserController.loginAdmin);

router
  .route("/users/search")
  .get(authenticate([UserRoles.Admin]), adminUserController.searchUsersByEmail);

router
  .route("/users/promote")
  .put(authenticate([UserRoles.Admin]), adminUserController.promoteUser);
router
  .route("/users/moderator-permissions")
  .put(
    authenticate([UserRoles.Admin]),
    adminUserController.moderatorPermissionEdit
  );
router
  .route("/users/remove-permissions")
  .put(authenticate([UserRoles.Admin]), adminUserController.removePermissions);
router
  .route("/users/demote")
  .put(authenticate([UserRoles.Admin]), adminUserController.demoteUser);
router
  .route("/users/moderators")
  .get(authenticate([UserRoles.Admin]), adminUserController.getAllModerators);

router
  .route("/users/assign-coin")
  .put(
    authenticate([UserRoles.Admin, UserRoles.Moderator]),
    adminUserController.assignCoinToUser
  );

router.get(
  "/users",
  authenticate([UserRoles.Admin]),
  adminUserController.retrieveAllUsers
);
router.put(
  "/users/activity-zone",
  authenticate([UserRoles.Admin]),
  validateRequest(ActivityZoneUpdateDto),
  adminUserController.updateActivityZone
);

router
  .route("/users/stats/update/:userId")
  .post(
    authenticate([UserRoles.Admin]),
    validateRequest(UpdateStatDto),
    adminUserController.updateUserStat
  );

router
  .route("/gift")
  .post(
    authenticate([UserRoles.Admin]),
    upload.single("image"),
    validateRequest(CreateGiftDto),
    adminUserController.createGift
  )
  .get(authenticate(), adminUserController.getGifts);

router.route("/gift/:id").put(authenticate([UserRoles.Admin]), upload.single("image"), adminUserController.updateGift).delete(authenticate(), adminUserController.deleteGift);

export default router;
