import express from "express";
import { SvipController } from "../controllers/svip_controller";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";

const router = express.Router();
const controller = new SvipController();

// ── Admin: SVIP config management ────────────────────────────────────────
router
  .route("/config")
  .get(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), controller.getConfig)
  .put(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), controller.updateConfig);

// ── User: own SVIP status ────────────────────────────────────────────────
router
  .route("/status")
  .get(authenticate(), controller.getMySvipStatus);

// ── Admin: view any user's SVIP status ───────────────────────────────────
router
  .route("/status/:userId")
  .get(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), controller.getUserSvipStatus);

export default router;
