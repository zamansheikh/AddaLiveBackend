// src/server.ts
import "reflect-metadata";
import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import express, { Application, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import session, { Store } from "express-session";
import http from "http";

// import mongoClient from "mongodb";
import mongoose, { omitUndefined } from "mongoose";
// router imports
import AuthRouter from "./router/auth_routes";
import AdminRouter from "./router/admin_routes";
import ReelsRouter from "./router/reels_routes";
import PostRouter from "./router/post_routes";
import StoryRouter from "./router/story_routes";
// import FriendShipRouter from "./router/friendship_router";
import ChatRouter from "./router/chat_router";
import GameRouter from "./router/game_router";
import GreedyGameRouter from "./greedy_game/routes/greedy_game_router";
import GamesAdminRouter from "./greedy_game/routes/games_admin_router";
import FollowerRouter from "./router/follower_routes";
import PowerSharedRoutes from "./router/portal_user_routes";
import StoreRoutes from "./router/store_router";
import AppVersionRoutes from "./router/app_version_routes";
import GiftAudioRoketRouter from "./router/gift_audio_rocket_route";
import BlockedEmail from "./router/blocked_email_routes";
import AudioRoomRouter from "./router/audio_room_routes";
import RankingRouter from "./router/ranking_routes";
import RoomSupportRouter from "./router/room_support_router";
import ReportRouter from "./router/report_routes";
import MagicBallHostRouter from "./router/magic_ball_host_routes";
import FamilyRouter from "./router/family_router";
import CoinBagRouter from "./router/coin_bag_router";
import FamilyRewardRouter from "./router/family_reward_router";
import ReferralRouter from "./router/referral_routes";
import RocketConfigRouter from "./router/rocket_config_routes";
import CoinExchangeRouter from "./router/coin_exchange_route";
import RoomLevelCriteriaRouter from "./router/room_level_criteria_router";
import CoinPurchaseRouter from "./router/coin_purchase_route";
import AgoraConfigRouter from "./router/agora_config_routes";
import AgoraTokenRouter from "./router/agora_token_routes";
import AgoraStatsRouter from "./router/agora_stats_routes";
import XpConfigRouter from "./router/xp_config_routes";
import MedalRouter from "./router/medal_routes";
import AppResellerRouter from "./router/app_reseller_routes";
import SvipRouter from "./router/svip_routes";
import FamilySupportRewardRouter from "./router/family_support_reward_router";

import fs from "fs";
import path from "path";
import StoreItemModel from "./models/store/store_item_model";
import { IStoreCategoryDocument } from "./models/store/store_category_model";

// error handlers
import globalErrorHandler from "./core/errors/global_error_handlar";
import CronManager from "./core/corn/corn_manager";
import { roomSupportRewardSystem } from "./core/corn/jobs/room_support_jobs";
import { getCronSchedule } from "./core/config/cron_schedules";
import { resetMagicBallJob } from "./core/corn/jobs/magic_ball_jobs";
import { svipMonthlyRetentionJob } from "./core/corn/jobs/svip_jobs";
import { distributeFamilySupportRewards } from "./core/corn/jobs/family_support_reward_job";
import {
  deleteFileApiFunction,
  saveToLocalFileApiFunction,
  uploadFileCloudFunction,
} from "./core/Utils/save_file_to_local_sys";
import { upload } from "./core/middlewares/multer";
import SingletonSocketServer from "./core/sockets/singleton_socket_server";
import RedisConfig from "./core/config/redis_config";
import { initializeMagicBallTrackers } from "./services/magic_ball";
import { RoomLevelCriteriaService } from "./services/audio_room/room_level_criteria_service";
import { RocketConfigService } from "./services/audio_room/rocket_config_service";
import { XpConfigService } from "./services/admin/xp_config_service";
import { SvipConfigService } from "./services/admin/svip_config_service";
import { FamilySupportRewardService } from "./services/family/family_support_reward_service";

// Initialize Magic Ball Trackers
initializeMagicBallTrackers();

// Initialize dotenv for environment variables
dotenv.config();

// Create the Express application
const app: Application = express();

const server = http.createServer(app);

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost",
      "http://localhost:3004",
      "http://88.222.213.235:3004",
      "http://88.222.213.235:8000",
      "http://192.168.68.51:3004",
      "https://admin.zigoliveapp.xyz",
      "https://admin.zigoliveapp.xyz:3004",
      "https://api.zigoliveapp.xyz",
      "http://admin.zigoliveapp.xyz",
      "http://dlstarlive.com:8000",
      "http://localhost:8000",
      "http://127.0.0.1:8080",
      "http://147.93.103.135:8000",
      "http://147.93.103.135:8080",
      "http://147.93.103.135",
      "http://dlstarliveplan1.com:8080/",
      "http://31.97.222.97:8080/",
      "http://dlstarliveplan1.com:8000/",
      "http://31.97.222.97:8000/",
      "http://dlstarliveplan1.com:8000",
      "http://31.97.222.97:8000",
      "http://dlstarliveplan1.com:8080",
      "http://31.97.222.97:8080",
      "https://admin.zigoliveapp.xyz",
      "https://addavoicerom.com",
      "https://www.addavoicerom.com",
      "https://api.addavoicerom.com",
      "https://agora.addavoicerom.com",
      "https://admin.addavoicerom.com",
    ],
    credentials: true,
  }),
); // Enable CORS

app.use(morgan("dev")); // Logging middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json({
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf;
  }
})); // Parse JSON request bodies

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false, // Don’t save the session to the store if it wasn’t modified during the request.
    saveUninitialized: true, // Save a new session even if it hasn't been modified.
  }),
);

// for public access to the url
app.use("/uploads", express.static(path.join(process.cwd(), "public/uploads")));

// Routes
app.use("/api/auth", AuthRouter);
app.use("/api/admin", AdminRouter);
app.use("/api/reels", ReelsRouter);
app.use("/api/posts", PostRouter);
app.use("/api/stories", StoryRouter);
// app.use("/api/friends", FriendShipRouter);
app.use("/api/chats", ChatRouter);
app.use("/api/games", GameRouter);
// Games integration. Mounted under BOTH prefixes so the games backend's
// PROVIDER_BASE_URL may end in either `/api/game` or the versioned `/api/v1`.
// The HMAC covers the full path it actually sends, so both mounts verify.
// Each exposes `/internal/*` (signed, server-to-server) and `/session/token`.
app.use("/api/game", GreedyGameRouter);
app.use("/api/v1", GreedyGameRouter);
app.use("/api/admin/game", GamesAdminRouter);
app.use("/api/followers", FollowerRouter);
app.use("/api/power-shared", PowerSharedRoutes);
app.use("/api/store", StoreRoutes);
app.use("/release", AppVersionRoutes);
app.use("/api/gifts-audio-rocket", GiftAudioRoketRouter);
app.use("/api/blocked-emails", BlockedEmail);
app.use("/api/audio-room", AudioRoomRouter);
app.use("/api/ranking", RankingRouter);
app.use("/api/room-support", RoomSupportRouter);
app.use("/api/reports", ReportRouter);
app.use("/api/magic-ball", MagicBallHostRouter);
app.use("/api/family", FamilyRouter);
app.use("/api/family-rewards", FamilyRewardRouter);
app.use("/api/coin-bag", CoinBagRouter);
app.use("/api/referral", ReferralRouter);
app.use("/api/admin/rocket-config", RocketConfigRouter);
app.use("/api/admin/room-level-criteria", RoomLevelCriteriaRouter);
app.use("/api/coin-exchange", CoinExchangeRouter);
app.use("/api/coin-purchase", CoinPurchaseRouter);
app.use("/api/admin/agora-config", AgoraConfigRouter);
// Admin-only Agora request analytics (counts recorded by the token endpoints).
app.use("/api/admin/agora-stats", AgoraStatsRouter);
// Public Agora RTC/RTM token endpoints (moved here from the standalone/admin
// token server) — the mobile app calls /api/agora/token/{rtc,rtm} directly.
app.use("/api/agora", AgoraTokenRouter);
app.use("/api/admin/xp-config", XpConfigRouter);

// Medal routes
app.use("/api/medals", MedalRouter);

// SVIP routes
app.use("/api/svip", SvipRouter);

// App Reseller routes
app.use("/api/app-reseller", AppResellerRouter);

// Family Support Reward routes
app.use("/api/admin/family-support-rewards", FamilySupportRewardRouter);

app.post(
  "/api/upload-file-cloud",
  upload.single("file"),
  uploadFileCloudFunction,
);
app.delete("/api/delete-file-cloud", deleteFileApiFunction);

app.get("/api/get-cached-svga", async (req: Request, res: Response) => {
  try {
    const items = await StoreItemModel.find({ deleteStatus: false }).populate(
      "categoryId",
    );

    const groupedSvgas: Record<string, string[]> = {};

    items.forEach((item) => {
      if (!item.isPremium) {
        const category = item.categoryId as unknown as IStoreCategoryDocument;
        const categoryName = category?.title;

        if (categoryName && item.svgaFile) {
          if (!groupedSvgas[categoryName]) {
            groupedSvgas[categoryName] = [];
          }
          if (!groupedSvgas[categoryName].includes(item.svgaFile)) {
            groupedSvgas[categoryName].push(item.svgaFile);
          }
        }
      } else if (item.bundleFiles && item.bundleFiles.length > 0) {
        item.bundleFiles.forEach((bundle) => {
          const categoryName = bundle.categoryName;
          if (categoryName && bundle.svgaFile) {
            if (!groupedSvgas[categoryName]) {
              groupedSvgas[categoryName] = [];
            }
            if (!groupedSvgas[categoryName].includes(bundle.svgaFile)) {
              groupedSvgas[categoryName].push(bundle.svgaFile);
            }
          }
        });
      }
    });

    res.status(200).json({
      status: "success",
      data: groupedSvgas,
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// app.get("/release/latest", async (req: Request, res: Response) => {
//   res.send({
//     Version: "1.0.0",
//     Release_note:
//       "Initial stable release. Includes core features, bug fixes from beta testing, and performance improvements. This version provides a solid foundation for future updates.",
//     DownloadURL:
//       "https://drive.google.com/drive/folders/12W5gMuBzXt98CLQYbPvmnOTifk5G2RnZ?usp=sharing",
//   });
// });

app.use(globalErrorHandler);

const PORT = process.env.PORT || 8000;
const MONGOURL =
  process.env.MONGO_URL || "mongodb://localhost:27017/livestreaming";

mongoose.connect(MONGOURL).then(async () => {
  console.log("DB Connected");

  try {
    await RoomLevelCriteriaService.bootstrap();
  } catch (err) {
    console.error("Failed to bootstrap Room Level Criteria:", err);
  }

  // Sync Rocket Configuration from DB to memory
  try {
    await RocketConfigService.bootstrap();
  } catch (err) {
    console.error("Failed to bootstrap Rocket Configuration:", err);
  }

  // Bootstrap XP Configuration (seed defaults + warm cache)
  try {
    await XpConfigService.bootstrap();
  } catch (err) {
    console.error("Failed to bootstrap XP Configuration:", err);
  }

  // Bootstrap SVIP Configuration (seed defaults + warm cache)
  try {
    await SvipConfigService.bootstrap();
  } catch (err) {
    console.error("Failed to bootstrap SVIP Configuration:", err);
  }

  // Bootstrap Family Support Rewards (seed defaults if empty)
  try {
    await FamilySupportRewardService.bootstrap();
  } catch (err) {
    console.error("Failed to bootstrap Family Support Rewards:", err);
  }

  // Connect to Redis
  try {
    await RedisConfig.connect();
  } catch (err) {
    console.error("Failed to connect to Redis:", err);
  }

  // socket connection to the http server
  // SocketServer.initialize(server);
  SingletonSocketServer.initialize(server);
  // Start the server
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    // Starting corn server
    const cronManager = CronManager.getInstance();
    cronManager.start();
    // cronManager.register(getCronSchedule("ROOM_XP"), resetRoomXPTrackingSystem); // Everyday at 12:00 AM reset xp tracking system
    cronManager.register(getCronSchedule("ROOM_SUPPORT"), roomSupportRewardSystem); // every week at sunday room support reset
    cronManager.register(getCronSchedule("MAGIC_BALL"), resetMagicBallJob); // Everyday at 12:00 AM reset xp tracking system
    cronManager.register(getCronSchedule("SVIP_MONTHLY"), svipMonthlyRetentionJob); // 1st of every month at midnight — SVIP retention check
    cronManager.register(getCronSchedule("FAMILY_SUPPORT_REWARD"), distributeFamilySupportRewards); // Every Sunday at midnight — distribute family support rewards
  });
});

// ─── Crash log — writes the error to crash.log so you can read it after the server dies ───
const logError = (type: string, err: unknown) => {
  const entry = `[${new Date().toISOString()}] ${type}: ${err instanceof Error ? err.stack || err.message : String(err)}\n`;
  fs.appendFileSync(path.join(process.cwd(), "crash.log"), entry);
  console.error(entry.trim());
};

process.on("unhandledRejection", (reason) => logError("UNHANDLED REJECTION", reason));
process.on("uncaughtException", (err) => { logError("UNCAUGHT EXCEPTION", err); process.exit(1); });

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  await RedisConfig.disconnect();
  process.exit(0);
});
