import express from "express";
import AppResellerController from "../controllers/app_reseller_controller";
import AppResellerService from "../services/app_reseller/app_reseller_service";
import UserRepository from "../repository/users/user_repository";
import User from "../models/user/user_model";
import UserStatsRepository from "../repository/users/userstats_repository";
import UserStats from "../models/userstats/userstats_model";
import CoinHistoryRepository from "../repository/coins/coinHistoryRepository";
import CoinHistoryModel from "../models/coins/coinHistoryModel";
import LevelTagBgRepository from "../repository/users/level_tag_bg_repository";
import LevelTagBgModel from "../models/user/level_tag_bg_model";
import { ReferralService } from "../services/referral/referral_service";
import { ReferralRepository } from "../repository/referral/referral_repository";
import { ReferralModel } from "../models/referral/referralModel";
import { ReferralWalletRepository } from "../repository/referral/referral_wallet_repository";
import { ReferralWalletModel } from "../models/referral/referralWalletModel";
import { ReferralWithdrawalRepository } from "../repository/referral/referral_withdrawal_repository";
import { ReferralWithdrawalModel } from "../models/referral/referralWithdrawalModel";
import { ReferralConfigRepository } from "../repository/referral/referral_config_repository";
import { ReferralConfigModel } from "../models/referral/referralConfigModel";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";
import AdminRepository from "../repository/admin/admin_repository";
import Admin from "../models/admin/admin_model";
import PortalUserRepository from "../repository/portal_user/portal_user_repository";
import PortalUser from "../models/portal_users/protal_user_model";

const router = express.Router();

const userRepository = new UserRepository(User);
const userStatsRepository = new UserStatsRepository(UserStats);
const coinHistoryRepository = new CoinHistoryRepository(CoinHistoryModel);
const levelTagBgRepository = new LevelTagBgRepository(LevelTagBgModel);
const adminRepository = new AdminRepository(Admin);
const portalUserRepository = new PortalUserRepository(PortalUser);

const referralRepository = new ReferralRepository(ReferralModel);
const walletRepository = new ReferralWalletRepository(ReferralWalletModel);
const withdrawalRepository = new ReferralWithdrawalRepository(
  ReferralWithdrawalModel,
);
const configRepository = new ReferralConfigRepository(ReferralConfigModel);

const referralService = new ReferralService(
  referralRepository,
  walletRepository,
  withdrawalRepository,
  configRepository,
  userRepository,
  userStatsRepository,
);

const appResellerService = new AppResellerService(
  userRepository,
  userStatsRepository,
  coinHistoryRepository,
  levelTagBgRepository,
  referralService,
  adminRepository,
  portalUserRepository,
);
const appResellerController = new AppResellerController(appResellerService);

// Route to get all resellers (paginated)
router
  .route("/")
  .get(
    authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
    appResellerController.getAllResellers,
  );

// Route to update a user's role (only between "user" and "re-seller")
router
  .route("/change-role")
  .put(
    authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
    appResellerController.updateUserRole,
  );

// Route for resellers to give coins to app users
router
  .route("/give-coins")
  .put(
    authenticate(),
    appResellerController.giveCoinsToUser,
  );

// Route for Admin/SubAdmin to give coins to app resellers
router
  .route("/give-coins-to-reseller")
  .put(
    authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
    appResellerController.giveCoinsToReseller,
  );

export default router;
