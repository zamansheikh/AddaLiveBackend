import express from "express";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";

import { RoomLevelCriteriaRepository } from "../repository/audio_room/room_level_criteria_repository";
import RoomLevelCriteriaModel from "../models/audio_room/room_level_criteria_model";
import { RoomLevelCriteriaService } from "../services/audio_room/room_level_criteria_service";
import { RoomLevelCriteriaController } from "../controllers/audio_room/room_level_criteria_controller";

const router = express.Router();

// Dependency Injection Setup
const repository = new RoomLevelCriteriaRepository(RoomLevelCriteriaModel);
const service = new RoomLevelCriteriaService(repository);
const controller = new RoomLevelCriteriaController(service);

/**
 * Admin Routes for managing Audio Room Level Criteria.
 * These routes allow real-time adjustment of room support goals and rewards.
 */

router
  .route("/")
  /** Get all configured levels sorted by level number */
  .get(authenticate(), controller.getAllLevels) 
  /** Create or update a specific level's criteria */
  .post(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), controller.upsertLevel);

router
  .route("/:level")
  /** Remove a specific level configuration */
  .delete(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), controller.deleteLevel);

export default router;
