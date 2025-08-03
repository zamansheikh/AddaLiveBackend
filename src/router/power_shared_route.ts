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
import SharedPowerService from "../services/admin/shared_power_service";
import { SharedPowerController } from "../controllers/admin/shared_power_controller";

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
const sharedPowerController = new SharedPowerController(sharedPowerService);



router
  .route("/users/search")
  .get(authenticate([UserRoles.Admin]), sharedPowerController.searchUsersByEmail); 

router
  .route("/users/promote")
  .put(authenticate([UserRoles.Admin]), sharedPowerController.promoteUser); 

router
  .route("/users/demote")
  .put(authenticate([UserRoles.Admin]), sharedPowerController.demoteUser); 

router
  .route("/users/assign-coin")
  .put(
    authenticate([UserRoles.Admin, UserRoles.Agency]),
    sharedPowerController.assignCoinToUser
  ); 

export default router;
