import express from 'express';
import UserRepository from '../repository/user_repository';
import User from '../models/user/user_model';
import AdminUserService from '../services/admin/admin_user_service';
import AdminUserController from '../controllers/admin/admin_user_controller';
import { validateRequest } from '../middlewares/validate_request';
import { ActivityZoneUpdateDto } from '../dtos/admin/activityzone_update_dto';

const router = express.Router();

const userRepository = new UserRepository(User);
const adminUserService = new AdminUserService(userRepository);
const adminUserController = new AdminUserController(adminUserService);

router.get("/users", adminUserController.retrieveAllUsers);
router.put("/users/activity-zone", validateRequest(ActivityZoneUpdateDto),adminUserController.updateActivityZone);

export default router;

