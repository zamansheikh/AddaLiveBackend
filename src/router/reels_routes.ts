import express from "express";
import ReelsRepository from "../repository/reels/reels_repository";
import Reels from "../models/reels/reel_model";
import ReelsService from "../services/reels/reels_service";
import ReelController from "../controllers/reel_controller";
import { upload } from "../middlewares/multer";
import { authenticate } from "../middlewares/auth_middleware";

const router = express.Router();

const reelRepository = new ReelsRepository(Reels);
const reelService = new ReelsService(reelRepository);
const reelsController = new ReelController(reelService);

router.post("/create", authenticate, upload.single('video'), reelsController.createReel);


export default router;

