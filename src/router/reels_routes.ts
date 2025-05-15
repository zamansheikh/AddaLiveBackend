import express from "express";
import ReelsRepository from "../repository/reels/reels_repository";
import Reels from "../models/reels/reel_model";
import ReelsService from "../services/reels/reels_service";
import ReelController from "../controllers/reel_controller";
import { upload } from "../middlewares/multer";
import { authenticate } from "../middlewares/auth_middleware";
import { validateRequest } from "../middlewares/validate_request";
import { UploadReelDto } from "../dtos/reels/upload_reel_dto";
import { customValidateFileResponse } from "../middlewares/custom_validate_file_response";
import { EditReelDto } from "../dtos/reels/edit_reel_dto";
import { ReelReactionDto } from "../dtos/reels/reel_reaction_dto";
import ReelsReactionRepostitory from "../repository/reels/likes/reel_reaction_repository";
import ReelsReactions from "../models/reels/likes/reels_reaction_model";

const router = express.Router();

const reelRepository = new ReelsRepository(Reels);
const reactionRepository = new ReelsReactionRepostitory(ReelsReactions);
const reelService = new ReelsService(reelRepository, reactionRepository);
const reelsController = new ReelController(reelService);

router.post("/create", authenticate, upload.single('video'), validateRequest(UploadReelDto), customValidateFileResponse({ isvideo: true }), reelsController.createReel);
router.put("/react/", authenticate,  validateRequest(ReelReactionDto), reelsController.reactOnReel);


export default router;

