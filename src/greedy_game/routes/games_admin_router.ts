import express from "express";
import { authenticate } from "../../core/middlewares/auth_middleware";
import { UserRoles } from "../../core/Utils/enums";
import GamesClientService from "../services/games_client_service";
import GamesAdminController from "../controllers/games_admin_controller";

const router = express.Router();

const gamesClientService = new GamesClientService();
const controller = new GamesAdminController(gamesClientService);

router.get(
  "/reconciliation",
  authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
  controller.getReconciliation,
);

export default router;
