import express from "express";
import { AgoraTokenController } from "../controllers/agora/agora_token_controller";

/**
 * Public Agora token routes (no auth) — the mobile app calls these directly
 * to join RTC/RTM channels. Mounted at `/api/agora` in server.ts.
 */
const router = express.Router();

router.get("/health", AgoraTokenController.health);

router.get("/token/info", AgoraTokenController.tokenInfo);

router
  .route("/token/rtc")
  .post(AgoraTokenController.rtcToken)
  .get(AgoraTokenController.rtcTokenGet);

router
  .route("/token/rtm")
  .post(AgoraTokenController.rtmToken)
  .get(AgoraTokenController.rtmTokenGet);

export default router;
