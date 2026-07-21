import express from "express";
import { FeedbackController } from "../controllers/feedback/feedback_controller";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";

const router = express.Router();
const controller = new FeedbackController();

const adminRoles = [UserRoles.Admin, UserRoles.SubAdmin];

// ── User (any authenticated app user) ──────────────────────────────────────
router.post("/", authenticate(), controller.sendMessage);
router.get("/my", authenticate(), controller.getMyThread);
router.get("/my/unread-count", authenticate(), controller.getMyUnreadCount);

// ── Admin ──────────────────────────────────────────────────────────────────
router.get("/threads", authenticate(adminRoles), controller.getThreads);
router.get(
  "/unread-count",
  authenticate(adminRoles),
  controller.getAdminUnreadCount,
);
router.get(
  "/threads/:userId",
  authenticate(adminRoles),
  controller.getThread,
);
router.post(
  "/threads/:userId/reply",
  authenticate(adminRoles),
  controller.reply,
);

export default router;
