import express from 'express';
import UserRepository from '../repository/user_repository';
import User from '../models/user/user_model';
import AdminUserService from '../services/admin/admin_user_service';
import AdminUserController from '../controllers/admin/admin_user_controller';
import { ActivityZoneUpdateDto } from '../dtos/admin/activityzone_update_dto';
import { validateRequest } from '../core/middlewares/validate_request';
import { UpdateStatDto } from '../dtos/admin/update_state_dto';
import UserStatsRepository from '../repository/userstats/userstats_repository';
import UserStats from '../models/userstats/userstats_model';
import { authenticate } from '../core/middlewares/auth_middleware';
import { UserRoles } from '../core/Utils/enums';
import AdminRepository from '../repository/admin/admin_repository';
import Admin from '../models/admin/admin_model';

const router = express.Router();

const userRepository = new UserRepository(User);
const userStatsRepository = new UserStatsRepository(UserStats);
const adminRepository = new AdminRepository(Admin);
const adminUserService = new AdminUserService(userRepository, userStatsRepository, adminRepository);
const adminUserController = new AdminUserController(adminUserService);

router.route("/auth").post(adminUserController.registerAdmin);

router.get("/users", authenticate([UserRoles.Admin]), adminUserController.retrieveAllUsers);
router.put("/users/activity-zone", authenticate([UserRoles.Admin]), validateRequest(ActivityZoneUpdateDto), adminUserController.updateActivityZone);

router.route("/users/stats/update/:userId").post(authenticate([UserRoles.Admin]), validateRequest(UpdateStatDto), adminUserController.updateUserStat)

export default router;

