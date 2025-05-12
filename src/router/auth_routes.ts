import  express from "express";
import User from '../models/user_model';
import UserRepository from "../repository/user_repository";
import AuthService from "../services/auth_services";
import  AuthController  from "../controllers/auth_controller";
import { validateRequest } from "../middlewares/validate_request";
import { RegisterUserDto } from "../dtos/auth/register_with_google_dto";
import { ProfileUpdateDto } from "../dtos/auth/profile_update_dto";
import { authenticate } from "../middlewares/auth_middleware";




const router = express.Router();

const userRepository = new UserRepository(User);
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);




router.post("/register-google",  validateRequest(RegisterUserDto) ,authController.registerWithGoogle)
router.put("/update-profile", authenticate,  validateRequest(ProfileUpdateDto) ,authController.registerWithGoogle)

export default router;


