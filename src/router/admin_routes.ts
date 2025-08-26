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
import PortalUser from "../models/portal_users/protal_user_model";
import PortalUserRepository from "../repository/portal_user/portal_user_repository";
import WithdrawBonusRepository from "../repository/room/withdraw_bonus_repository";
import WithdrawBonusModel from "../models/room/withdraw_bonus_model";

const router = express.Router();

const userRepository = new UserRepository(User);
const userStatsRepository = new UserStatsRepository(UserStats);
const adminRepository = new AdminRepository(Admin);
const giftRepository = new GiftRepository(Gifts);
const portalUserRepository = new PortalUserRepository(PortalUser);
const bonusRepository = new WithdrawBonusRepository(WithdrawBonusModel);

const adminUserService = new AdminUserService(
  userRepository,
  userStatsRepository,
  adminRepository,
  giftRepository,
  portalUserRepository,
  bonusRepository
);
const adminUserController = new AdminUserController(adminUserService);

router
  .route("/auth")
  .post(adminUserController.registerAdmin)
  .put(authenticate([UserRoles.Admin]), adminUserController.updateAdmin)
  .delete(authenticate([UserRoles.Admin]), adminUserController.deleteAdmin)
  .get(authenticate([UserRoles.Admin]), adminUserController.getAdminProfile);

router
  .route("/auth/assign-coin")
  .put(authenticate([UserRoles.Admin]), adminUserController.assignCoinToAdmin);

router.route("/login").post(adminUserController.loginAdmin);

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
  .route("/users/moderators")
  .get(authenticate([UserRoles.Admin]), adminUserController.getAllModerators);

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
    upload.fields([
      { name: "previewImage", maxCount: 1 },
      { name: "svgaImage", maxCount: 1 },
    ]),
    validateRequest(CreateGiftDto),
    adminUserController.createGift
  )
  .get(authenticate(), adminUserController.getGifts);

router
  .route("/gift-category")
  .get(
    authenticate([UserRoles.Admin, UserRoles.Agency]),
    adminUserController.getGiftCategory
  );

router
  .route("/gift/:id")
  .put(
    authenticate([UserRoles.Admin]),
    upload.fields([
      { name: "previewImage", maxCount: 1 },
      { name: "svgaImage", maxCount: 1 },
    ]),
    adminUserController.updateGift
  )
  .delete(authenticate([UserRoles.Admin]), adminUserController.deleteGift);

router
  .route("/create-role")
  .post(authenticate([UserRoles.Admin]), adminUserController.createPortalUser);

router
  .route("/role/:roleId")
  .get(authenticate([UserRoles.Admin]), adminUserController.getRoleDetails)
  .delete(authenticate([UserRoles.Admin]), adminUserController.deleteRole);

router
  .route("/role/permissions/add/:roleId")
  .put(authenticate([UserRoles.Admin]), adminUserController.addRolePermissions);
router
  .route("/role/permissions/remove/:roleId")
  .put(
    authenticate([UserRoles.Admin]),
    adminUserController.removeRolePermissions
  );

router
  .route("/role/activity-zone")
  .put(authenticate([UserRoles.Admin]), adminUserController.blockPortalUser);

router
  .route("/withdraw-requests")
  .get(
    authenticate([UserRoles.Admin]),
    adminUserController.getWithdrawRequests
  );
router
  .route("/withdraw-requests/:bonusId")
  .put(
    authenticate([UserRoles.Admin]),
    adminUserController.updateWithdrawBonusStatus
  );

router.route("/salaries")
router.route("/salaries/:id")

export default router;
