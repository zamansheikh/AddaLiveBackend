// src/server.ts
import express, { Application, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import session, { Store } from "express-session";
import http from "http";
// socket server
import SocketServer from "./core/sockets/socket_server";
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
import FollowerRouter from "./router/follower_routes";
import PowerSharedRoutes from "./router/portal_user_routes";
import StoreRoutes from "./router/store_router";
import AppVersionRoutes from "./router/app_version_routes";

// error handlers
import globalErrorHandler from "./core/errors/global_error_handlar";

// Initialize dotenv for environment variables
dotenv.config();

// Create the Express application
const app: Application = express();

const server = http.createServer(app);

// socket connection to the http server
SocketServer.initialize(server);

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost",
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
    ],
    credentials: true,
  })
); // Enable CORS

app.use(morgan("dev")); // Logging middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Parse JSON request bodies

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false, // Don’t save the session to the store if it wasn’t modified during the request.
    saveUninitialized: true, // Save a new session even if it hasn't been modified.
  })
);

// Routes
app.use("/api/auth", AuthRouter);
app.use("/api/admin", AdminRouter);
app.use("/api/reels", ReelsRouter);
app.use("/api/posts", PostRouter);
app.use("/api/stories", StoryRouter);
// app.use("/api/friends", FriendShipRouter);
app.use("/api/chats", ChatRouter);
app.use("/api/games", GameRouter);
app.use("/api/followers", FollowerRouter);
app.use("/api/power-shared", PowerSharedRoutes);
app.use("/api/store", StoreRoutes);
app.use("/release", AppVersionRoutes);

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

mongoose.connect(MONGOURL).then(() => {
  console.log("DB Connected");
  // Start the server
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
