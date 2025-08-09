import express from "express";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";
import UserRepository from "../repository/user_repository";
import User from "../models/user/user_model";
import UserStatsRepository from "../repository/userstats/userstats_repository";
import UserStats from "../models/userstats/userstats_model";
import AdminRepository from "../repository/admin/admin_repository";
import Admin from "../models/admin/admin_model";
import PortalUserRepository from "../repository/portal_user/portal_user_repository";
import PortalUser from "../models/portal_users/protal_user_model";
import SharedPowerService from "../services/admin/portal_user_service";
import { PortalUserControllers } from "../controllers/admin/portal_user_controller";
import { upload } from "../core/middlewares/multer";

const router = express.Router();

const userRepository = new UserRepository(User);
const userStatsRepository = new UserStatsRepository(UserStats);
const adminRepository = new AdminRepository(Admin);
const portalUserRepository = new PortalUserRepository(PortalUser);

const sharedPowerService = new SharedPowerService(
  userRepository,
  userStatsRepository,
  adminRepository,
  portalUserRepository
);
const portalUserControllers = new PortalUserControllers(sharedPowerService);

router
  .route("/auth")
  .post(portalUserControllers.loginPortalUser)
  .put(
    authenticate([
      UserRoles.SubAdmin,
      UserRoles.Merchant,
      UserRoles.Reseller,
      UserRoles.countrySubAdmin,
      UserRoles.CountryAdmin,
      UserRoles.Agency,
    ]),
    upload.single("avatar"),
    portalUserControllers.updateMyProfile
  );

router
  .route("/users/search")
  .get(
    authenticate([
      UserRoles.Admin,
      UserRoles.SubAdmin,
      UserRoles.Agency,
      UserRoles.Merchant,
      UserRoles.Reseller,
    ]),
    portalUserControllers.searchUsersByEmail
  );

router.get(
  "/users",
  authenticate([
    UserRoles.Admin,
    UserRoles.SubAdmin,
    UserRoles.Agency,
    UserRoles.Merchant,
    UserRoles.Reseller,
  ]),
  portalUserControllers.retrieveAllUsers
);

router
  .route("/users/promote")
  .put(authenticate([UserRoles.Agency]), portalUserControllers.promoteUser);

router
  .route("/users/demote")
  .put(authenticate([UserRoles.Agency]), portalUserControllers.demoteUser);

router
  .route("/users/assign-coin")
  .put(
    authenticate([UserRoles.Admin, UserRoles.Merchant, UserRoles.Reseller]),
    portalUserControllers.assignCoinToUser
  );

export default router;
