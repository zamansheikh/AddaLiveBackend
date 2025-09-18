// src/core/sockets/socket_server.ts

import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { registerGroupRoomHandler } from "./handlers/group_room_handler";
import { RoomTypes, SocketChannels } from "../Utils/enums";
import UserRepository from "../../repository/users/user_repository";
import User from "../../models/user/user_model";
import { IUserDocument } from "../../models/user/user_model_interface";
import mongoose from "mongoose";
import MyBucketRepository from "../../repository/store/my_bucket_repository";
import MyBucketModel from "../../models/store/my_bucket_model";
import StoreCategoryRepository from "../../repository/store/store_category_repository";
import StoreCategoryModel from "../../models/store/store_category_model";

export interface IMemberDetails {
  name: string;
  avatar: string;
  uid: string;
  country: string;
  _id: mongoose.Schema.Types.ObjectId | string;
  equipedStoreItems: Record<string, string>;
}

export interface RoomData {
  hostId: string;
  roomType: RoomTypes;
  hostDetails?: IUserDocument | null;
  hostCoins: number;
  members: Set<string>;
  membersDetails: IMemberDetails[];
  messages: {
    name: string;
    avatar: string;
    uid: string;
    country: string;
    _id: mongoose.Schema.Types.ObjectId | string;
    text: string;
    equipedStoreItems: Record<string, string>;
  }[];
  broadcastersDetails: IMemberDetails[];
  bannedUsers: Set<string>;
  brodcasters: Set<string>;
  adminDetails: IMemberDetails | null;
  callRequests: Set<IMemberDetails>;
  mutedUsers: Set<string>;
  title: string;
}

export default class SocketServer {
  private static instance: SocketServer;
  private io: Server;
  private onlineUsers = new Map<string, string>(); // Map<userId, socketId>
  private disconnectedUsers = new Map<
    string,
    { timeOut: NodeJS.Timeout; roomId?: string }
  >(); // Map<userId, socketId>
  private hostedRooms = {} as Record<string, RoomData>;
  private userRepo = new UserRepository(User);
  private bucketRepo = new MyBucketRepository(MyBucketModel);
  private categoryRepo = new StoreCategoryRepository(StoreCategoryModel);

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
        this.handleUserConnect(userId, socket);
      }

      registerGroupRoomHandler(
        this.io,
        socket,
        this.onlineUsers,
        this.hostedRooms,
        this.userRepo,
        this.bucketRepo,
        this.categoryRepo
      );

      socket.on("disconnect", () => {
        // remove the users when disconnected from online users
        if (userId) {
          this.onlineUsers.delete(userId);
          console.log(`User ${userId} disconnected`);
        }
        for (const [roomId, roomData] of Object.entries(this.hostedRooms)) {
          if (!roomData.members.has(userId)) continue;
          const timeOut = setTimeout(() => {
            this.disconnectedUsers.delete(userId);
            this.hanldeUserDisconnect(userId, roomId, roomData);
          }, 30000);
          this.disconnectedUsers.set(userId, { timeOut, roomId });
          socket.leave(roomId);
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

  public updateRoomCoin(roomId: string, coin: number): void {
    const room = this.hostedRooms[roomId];
    if (room) {
      room.hostCoins += coin;
    }
  }

  private handleUserConnect(userId: string, socket: Socket) {
    if (this.disconnectedUsers.has(userId)) {
      clearTimeout(this.disconnectedUsers.get(userId)?.timeOut);
      this.disconnectedUsers.delete(userId);
      if (this.disconnectedUsers.get(userId)?.roomId) {
        socket.join(this.disconnectedUsers.get(userId)?.roomId!);
      }
    }
    this.onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} connected with socket ID: ${socket.id}`);
  }

  private hanldeUserDisconnect(
    userId: string,
    roomId: string,
    roomData: RoomData
  ) {
    // remove the users and leave the room when diconnected

    if (roomData.members.has(userId)) {
      if (roomData.brodcasters.has(userId)) {
        roomData.brodcasters.delete(userId);
        roomData.broadcastersDetails = roomData.broadcastersDetails.filter(
          (broadcaster) => broadcaster._id.toString() !== userId
        );
        this.io
          .to(roomId)
          .emit(
            SocketChannels.broadcasterList,
            Array.from(roomData.broadcastersDetails)
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
      const userDetails = roomData.membersDetails.filter(
        (member) => member._id.toString() == userId
      );
      roomData.membersDetails = roomData.membersDetails.filter(
        (member) => member._id.toString() !== userId
      );

      this.io.to(roomId).emit(SocketChannels.userLeft, userDetails);
    }
    // Optionally delete empty rooms
    if (roomData.members.size === 0) {
      delete this.hostedRooms[roomId];
      this.io.to(roomId).emit(SocketChannels.roomClosed, {
        roomId,
        message: "Room has been closed by the host",
      });
    }
  }
}
