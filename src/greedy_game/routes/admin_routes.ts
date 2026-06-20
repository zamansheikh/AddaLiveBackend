import express from "express";
import GreedyGameAdminController from "../controllers/admin_controller";
import GreedyAdminService from "../services/greedy_admin_service";
import { authenticate } from "../../core/middlewares/auth_middleware";
import { UserRoles } from "../../core/Utils/enums";

const router = express.Router();

const service = new GreedyAdminService();
const controller = new GreedyGameAdminController(service);

router
  .route("/config")
  .get(
    authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
    controller.getConfig,
  )
  .put(
    authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
    controller.updateConfig,
  );

router.post(
  "/force-result",
  authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
  controller.forceResult,
);

router.get(
  "/rounds",
  authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
  controller.getRoundHistory,
);

router.get(
  "/rounds/:roundId",
  authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
  controller.getRoundDetail,
);

router.get(
  "/dashboard",
  authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
  controller.getDashboardStats,
);

router.get(
  "/users/search",
  authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
  controller.searchUser,
);

router.get(
  "/users/:userId/details",
  authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
  controller.getUserDetails,
);

router.get(
  "/users/:userId/bets",
  authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
  controller.getUserBetHistory,
);

router.get(
  "/pause-status",
  authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
  controller.getPauseStatus,
);

router.post(
  "/pause",
  authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
  controller.pauseGame,
);

router.post(
  "/resume",
  authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
  controller.resumeGame,
);

export default router;
