// src/core/sockets/socket_server.ts

import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { registerGroupRoomHandler } from "./handlers/group_room_handler";
import { RoomTypes, SocketChannels } from "../Utils/enums";
import UserRepository from "../../repository/user_repository";
import User from "../../models/user/user_model";
import { IUserDocument } from "../../models/user/user_model_interface";
import { Socket } from "net";
import mongoose from "mongoose";

export interface RoomData {
  hostId: string;
  roomType: RoomTypes;
  hostDetails?: IUserDocument | null;
  members: Set<string>;
  messages: {
    name: string;
    avatar: string;
    uid: string;
    country: string;
    _id: mongoose.Schema.Types.ObjectId | string;
    text: string;
  }[];
  bannedUsers: Set<string>;
  brodcasters: Set<string>;
  callRequests: Set<{
    name: string;
    avatar: string;
    uid: string;
    country: string;
    _id: mongoose.Schema.Types.ObjectId | string;
  }>;
  title: string;
}

export default class SocketServer {
  private static instance: SocketServer;
  private io: Server;
  private onlineUsers = new Map<string, string>(); // Map<userId, socketId>
  private hostedRooms = {} as Record<string, RoomData>;
  private userRepo = new UserRepository(User);

  // Private constructor: enforce singleton usage
  private constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });
    this.initialize();
  }

  public static initialize(server: HttpServer): SocketServer {
    if (!SocketServer.instance) {
      SocketServer.instance = new SocketServer(server);
    }
    return SocketServer.instance;
  }

  public static getInstance(): SocketServer {
    if (!SocketServer.instance) {
      throw new Error(
        "SocketServer not initialized. Call initialize(server) first."
      );
    }
    return SocketServer.instance;
  }

  private initialize() {
    this.io.on("connection", (socket) => {
      const userId = socket.handshake.query.userId as string;
      if (userId) {
        this.onlineUsers.set(userId, socket.id);
        console.log(`User ${userId} connected with socket ID: ${socket.id}`);
      }

      registerGroupRoomHandler(
        this.io,
        socket,
        this.onlineUsers,
        this.hostedRooms,
        this.userRepo
      );

      socket.on("disconnect", () => {
        // remove the users when disconnected from online users
        if (userId) {
          this.onlineUsers.delete(userId);
          console.log(`User ${userId} disconnected`);
        }
        // remove the users and leave the room when diconnected
        for (const [roomId, roomData] of Object.entries(this.hostedRooms)) {
          if (roomData.members.has(userId)) {
            if (roomData.brodcasters.has(userId)) {
              roomData.brodcasters.delete(userId);
              this.io
                .to(roomId)
                .emit(
                  SocketChannels.broadcasterList,
                  Array.from(roomData.brodcasters)
                );
            }
            const objectToDelete = Array.from(roomData.callRequests).find(
              (request) => request._id.toString() === userId
            );
            if (objectToDelete) {
              roomData.callRequests.delete(objectToDelete);
              this.io
                .to(roomId)
                .emit(
                  SocketChannels.joinCallReqList,
                  Array.from(roomData.callRequests)
                );
            }
            roomData.members.delete(userId);
            socket.leave(roomId);
            this.io.to(roomId).emit(SocketChannels.userLeft, userId);
          }
          // Optionally delete empty rooms
          if (roomData.members.size === 0) {
            delete this.hostedRooms[roomId];
            this.io
              .to(roomId)
              .emit(SocketChannels.roomClosed, Object.keys(this.hostedRooms));
          }
        }
      });
    });
  }

  public getIO(): Server {
    return this.io;
  }

  public isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  public getSocketId(userId: string): string | undefined {
    return this.onlineUsers.get(userId);
  }
}
