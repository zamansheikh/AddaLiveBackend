import express from "express";
import { AgoraConfigService } from "../services/agora/agora_config_service";
import { AgoraConfigController } from "../controllers/agora/agora_config_controller";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";

const router = express.Router();

const service = new AgoraConfigService();
const controller = new AgoraConfigController(service);

router
  .route("/")
  .post(authenticate([UserRoles.SuperAdmin]), controller.create)
  .get(authenticate([UserRoles.SuperAdmin]), controller.getAll);

router
  .route("/:id")
  .get(authenticate([UserRoles.SuperAdmin]), controller.getById)
  .put(authenticate([UserRoles.SuperAdmin]), controller.update)
  .delete(authenticate([UserRoles.SuperAdmin]), controller.delete);

export default router;
