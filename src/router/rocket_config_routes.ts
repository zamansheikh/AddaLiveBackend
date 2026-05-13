import express from "express";
import { RocketConfigController } from "../controllers/audio_room/rocket_config_controller";
import { RocketConfigService } from "../services/audio_room/rocket_config_service";
import { RepositoryProviders } from "../core/providers/repository_providers";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";

const router = express.Router();

// Initialize layers
const rocketConfigService = new RocketConfigService(
  RepositoryProviders.rocketConfigRepositoryProvider
);
const rocketConfigController = new RocketConfigController(rocketConfigService);

/**
 * Admin Rocket Configuration Routes
 * Mounted at: /api/admin/rocket-config
 */

router
  .route("/")
  .get(authenticate([UserRoles.Admin]), rocketConfigController.getConfig)
  .post(authenticate([UserRoles.Admin]), rocketConfigController.updateConfig);

export default router;
