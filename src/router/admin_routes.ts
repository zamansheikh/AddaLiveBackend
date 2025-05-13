import express from 'express';
import UserRepository from '../repository/user_repository';
import User from '../models/user_model';
import AdminUserService from '../services/admin/admin_user_service';
import AdminUserController from '../controllers/admin/admin_user_controller';

const router = express.Router();

const userRepository = new UserRepository(User);
const adminUserService = new AdminUserService(userRepository);
const adminUserController = new AdminUserController(adminUserService);

router.get("/users", adminUserController.retrieveAllUsers);
router.put("/users/activity-zone", adminUserController.updateActivityZone);

export default router;

