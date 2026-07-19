import express from "express";
import { AgoraStatsController } from "../controllers/agora/agora_stats_controller";
import { agoraStatsService } from "../services/agora/agora_stats_service";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";

/**
 * Admin-only Agora request statistics. Mounted at `/api/admin/agora-stats`.
 *   GET  /api/admin/agora-stats        → current counters + recent history
 *   POST /api/admin/agora-stats/reset  → reset all counters
 */
const router = express.Router();

const controller = new AgoraStatsController(agoraStatsService);

router
  .route("/")
  .get(authenticate([UserRoles.SuperAdmin]), controller.getStats);

router
  .route("/reset")
  .post(authenticate([UserRoles.SuperAdmin]), controller.reset);

export default router;
