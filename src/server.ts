// src/server.ts
import express, { Application } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import session from 'express-session';
import http from 'http';
// socket server
import SocketServer from './core/sockets/socket_server';
// import mongoClient from "mongodb";
import mongoose from 'mongoose';
// router imports
import AuthRouter from "./router/auth_routes";
import AdminRouter from "./router/admin_routes";
import ReelsRouter from "./router/reels_routes";
import PostRouter from "./router/post_routes";
import StoryRouter from "./router/story_routes";
import FriendShipRouter from "./router/friendship_router";
import ChatRouter from "./router/chat_router";
import GameRouter from "./router/game_router";
// error handlers
import globalErrorHandler from './core/errors/global_error_handlar';



// Initialize dotenv for environment variables
dotenv.config();


// Create the Express application
const app: Application = express();

const server = http.createServer(app);


// socket connection to the http server 
SocketServer.initialize(server);

// Middleware
app.use(cors()); // Enable CORS
app.use(morgan('dev')); // Logging middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Parse JSON request bodies


// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default_secret',
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
app.use("/api/friends", FriendShipRouter);
app.use("/api/chats", ChatRouter);
app.use("/api/games", GameRouter);

app.use(globalErrorHandler);




const PORT = process.env.PORT || 8000;
const MONGOURL = process.env.MONGO_URL || 'mongodb://localhost:27017/livestreaming';

mongoose.connect(MONGOURL).then(
  () => {
    console.log("DB Connected");
    // Start the server
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  }
)


