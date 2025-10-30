import express from "express";
import { GiftAudioRocketRepository } from "../repository/gifts/gift_audio_rocket_repository";
import GiftAudioRoomRocketModel from "../models/gifts/gift_audio_rocket_model";
import { GiftAudioRocketService } from "../services/audio_room_gifts/gift_audio_rocket_service";
import { GiftAudioRocketController } from "../controllers/gift_audio_rocket_controller";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";



const router = express.Router();

const repository = new GiftAudioRocketRepository(GiftAudioRoomRocketModel);
const service = new GiftAudioRocketService(repository);
const controller = new GiftAudioRocketController(service);

router
  .route("/")
  .post(authenticate([UserRoles.Admin]), controller.createGiftAudioRocket)
  .get(authenticate([UserRoles.Admin]), controller.getGiftAudioRocket)
  .put(authenticate([UserRoles.Admin]), controller.updateGiftAudioRocket);

export default router;