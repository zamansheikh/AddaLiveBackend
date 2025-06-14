import express from "express";
import User from '../models/user/user_model';
import UserRepository from "../repository/user_repository";
import AuthService from "../services/auth/auth_services";
import AuthController from "../controllers/auth_controller";
import { RegisterUserDto } from "../dtos/auth/register_with_google_dto";
import { ProfileUpdateDto } from "../dtos/auth/profile_update_dto";
import { upload } from "../core/middlewares/multer";
import { authenticate } from "../core/middlewares/auth_middleware";
import { validateRequest } from "../core/middlewares/validate_request";
import UserStats from "../models/userstats/userstats_model";
import UserStatsRepository from "../repository/userstats/userstats_repository";
import { GiftUserDto } from "../dtos/auth/gift_user_dto";




const router = express.Router();

const userRepository = new UserRepository(User);
const userstatsRepository = new UserStatsRepository(UserStats);
const authService = new AuthService(userRepository, userstatsRepository);
const authController = new AuthController(authService);




router.post("/register-google", validateRequest(RegisterUserDto), authController.registerWithGoogle)
router.put("/update-profile", authenticate, upload.single('avatar'), validateRequest(ProfileUpdateDto), authController.updateProfile)
router.get("/user/:id", authenticate, authController.getUserDetails);
router.put("/user/gift", authenticate, validateRequest(GiftUserDto), authController.giftUser)

export default router;



