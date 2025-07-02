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

const router = express.Router();

const userRepository = new UserRepository(User);
const userStatsRepository = new UserStatsRepository(UserStats);
const adminUserService = new AdminUserService(userRepository, userStatsRepository);
const adminUserController = new AdminUserController(adminUserService);

router.get("/users", adminUserController.retrieveAllUsers);
router.put("/users/activity-zone", validateRequest(ActivityZoneUpdateDto),adminUserController.updateActivityZone);

router.route("/users/stats/update/:userId").post(validateRequest(UpdateStatDto), adminUserController.updateUserStat)

export default router;

