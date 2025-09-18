import express from "express";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";
import UserRepository from "../repository/users/user_repository";
import User from "../models/user/user_model";
import UserStatsRepository from "../repository/users/userstats_repository";
import UserStats from "../models/userstats/userstats_model";
import AdminRepository from "../repository/admin/admin_repository";
import Admin from "../models/admin/admin_model";
import PortalUserRepository from "../repository/portal_user/portal_user_repository";
import PortalUser from "../models/portal_users/protal_user_model";
import SharedPowerService from "../services/admin/portal_user_service";
import {  PortalUserControllers } from "../controllers/admin/portal_user_controller";
import { upload } from "../core/middlewares/multer";
import AgencyWithdrawModel from "../models/room/agency_withdraw_model";
import AgencyWithdrawRepository from "../repository/room/agency_withdraw_repository";
import SalaryRepository from "../repository/salary/salary_repository";
import SalaryModel from "../models/salary/salaryModel";
import CoinHistoryRepository from "../repository/coins/coinHistoryRepository";
import CoinHistoryModel from "../models/coins/coinHistoryModel";
import AgencyJoinRequestRepository from "../repository/request/AgencyJoinRequestRepository";
import AgencyJoinRequestModel from "../models/request/agencyJoinRequset";

const router = express.Router();

const userRepository = new UserRepository(User);
const userStatsRepository = new UserStatsRepository(UserStats);
const adminRepository = new AdminRepository(Admin);
const portalUserRepository = new PortalUserRepository(PortalUser);
const agencyWithdrawRepository = new AgencyWithdrawRepository(
  AgencyWithdrawModel
);
const salaryRepository = new SalaryRepository(SalaryModel);
const coinHistoryRepository = new CoinHistoryRepository(CoinHistoryModel);
const agencyJoinRequestRepository = new AgencyJoinRequestRepository(
  AgencyJoinRequestModel
);

const sharedPowerService = new SharedPowerService(
  userRepository,
  userStatsRepository,
  adminRepository,
  portalUserRepository,
  agencyWithdrawRepository,
  salaryRepository,
  coinHistoryRepository,
  agencyJoinRequestRepository
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
  )
  .get(
    authenticate([
      UserRoles.SubAdmin,
      UserRoles.Merchant,
      UserRoles.Reseller,
      UserRoles.countrySubAdmin,
      UserRoles.CountryAdmin,
      UserRoles.Agency,
    ]),
    portalUserControllers.getMyProfile
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

// for upper management exp: sub admin, merchant, country admin
router
  .route("/portal/:userRole")
  .get(authenticate(), portalUserControllers.getPortalUsers);

// for mid management exp: agency, re-seller, sub country admin
router
  .route("/portal/mid/:userRole/:parentId")
  .get(authenticate(), portalUserControllers.getPortalUsersByParent);

// for lower management exp: host
router
  .route("/portal/lower/:parentId")
  .get(authenticate(), portalUserControllers.getHosts);

router
  .route("/agency/withdraw")
  .post(authenticate([UserRoles.Agency]), portalUserControllers.withdrawAgency)
  .get(authenticate([UserRoles.Admin]), portalUserControllers.getAgencyWithdrawList);



router
  .route("/agency-all")
  .get(authenticate(), portalUserControllers.getAllAgencyList);

router
  .route("/portal-user/agency/:agencyId")
  .delete(
    authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
    portalUserControllers.deleteAgency
  );

router
  .route("/agency-join-request")
  .get(
    authenticate([UserRoles.Agency]),
    portalUserControllers.getAllJoinRequest
  );

router
  .route("/agency-join-request/:reqId")
  .put(
    authenticate([UserRoles.Agency]),
    portalUserControllers.updateJoinRequestStatus
  );


export default router;
