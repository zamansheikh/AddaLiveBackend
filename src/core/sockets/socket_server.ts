// src/core/sockets/socket_server.ts

import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { registerGroupRoomHandler } from "./handlers/group_room_handler";
import { RoomTypes, SocketAudioChannels, SocketChannels } from "../Utils/enums";
import UserRepository from "../../repository/users/user_repository";
import User from "../../models/user/user_model";
import { IUserDocument } from "../../models/user/user_model_interface";
import mongoose from "mongoose";
import MyBucketRepository from "../../repository/store/my_bucket_repository";
import MyBucketModel from "../../models/store/my_bucket_model";
import StoreCategoryRepository from "../../repository/store/store_category_repository";
import StoreCategoryModel from "../../models/store/store_category_model";
import {
  IAudioRoomData,
  IMemberDetails,
  IRoomMessage,
  RoomData,
} from "./interface/socket_interface";
import { registerAudioRoomHandler } from "./handlers/audio_room_handler";
import { isEmptyObject, socketResponse } from "../Utils/helper_functions";

export default class SocketServer {
  private static instance: SocketServer;
  private io: Server;
  private onlineUsers = new Map<string, string>(); // Map<userId, socketId>
  private disconnectedUsers = new Map<
    string,
    { timeOut: NodeJS.Timeout; roomId?: string }
  >(); // Map<userId, socketId>
  private hostedRooms = {} as Record<string, RoomData>;
  private hostedAudioRooms = {} as Record<string, IAudioRoomData>;
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

      registerAudioRoomHandler(
        this.io,
        socket,
        this.onlineUsers,
        this.hostedAudioRooms,
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
        // persist video room connection
        for (const [roomId, roomData] of Object.entries(this.hostedRooms)) {
          if (!roomData.members.has(userId)) continue;
          const timeOut = setTimeout(() => {
            this.disconnectedUsers.delete(userId);
            this.hanldeUserDisconnect(userId, roomId, roomData);
          }, 30000);
          this.disconnectedUsers.set(userId, { timeOut, roomId });
          socket.leave(roomId);
        }

        // persist audio room connection
        for (const [roomId, roomData] of Object.entries(this.hostedAudioRooms)) {
          if (!roomData.members.has(userId)) continue;
          const timeOut = setTimeout(()=> {
            this.disconnectedUsers.delete(userId);
            this.handleAudioRoomDisconnect(userId, roomId, roomData);
          }, 5000);
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

  public updateRoomCoin(
    roomId: string,
    coin: number,
    targetUserIds: string[]
  ): void {
    const room = this.hostedRooms[roomId];
    if (room) {
      const hasHostId = targetUserIds.filter((id) => id == room.hostId);
      if (hasHostId.length > 0) room.hostCoins += coin;
    }
  }

  public updateRoomRanking(
    roomId: string,
    userId: string,
    gifts: number,
    targetUserIds: string[]
  ) {
    const room = this.hostedRooms[roomId];
    if (room) {
      const hasHostId = targetUserIds.filter((id) => id == room.hostId);
      if (hasHostId.length > 0)
        for (let i = 0; i < room.ranking.length; i++) {
          if (room.ranking[i]._id.toString() === userId) {
            room.ranking[i].totalGiftSent! += gifts;
            break;
          }
        }
    }
  }

  private handleUserConnect(userId: string, socket: Socket) {
    if (this.disconnectedUsers.has(userId)) {
      clearTimeout(this.disconnectedUsers.get(userId)?.timeOut);
      if (this.disconnectedUsers.get(userId)?.roomId) {
        socket.join(this.disconnectedUsers.get(userId)?.roomId!);
      }
      this.disconnectedUsers.delete(userId);
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

    if (roomData.hostId == userId) {
      this.io.to(roomId).emit(SocketChannels.roomClosed, {
        roomId,
        message: "Room has been closed by the host",
      });

      const membersArray = Array.from(roomData.members);
      for (let i = 0; i < membersArray.length; i++) {
        const member = membersArray[i];
        const socketId = this.onlineUsers.get(member);
        if (socketId) {
          const io = this.io;
          const socket = io.sockets.sockets.get(socketId);
          if (socket) {
            socket.leave(roomId);
          }
        }
      }
      delete this.hostedRooms[roomId];
      return;
    }

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
      const socketId = this.onlineUsers.get(userId);
      if (socketId) {
        const io = this.io;
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.leave(roomId);
        }
      }

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

  handleAudioRoomDisconnect(
    userId: string,
    roomId: string,
    roomData: IAudioRoomData
  ) {
    if ((roomData.hostDetails as IMemberDetails)._id == userId) {
      socketResponse(this.io, SocketAudioChannels.RoomDetails, roomId, {
        success: true,
        message: "Room has been closed by the host",
        data: {},
      });
      const membersArray = Array.from(roomData.members);
      for (let i = 0; i < membersArray.length; i++) {
        const member = membersArray[i];
        const socketId = this.onlineUsers.get(member);
        if (socketId) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.leave(roomId);
          }
        }
      }
      delete this.hostedAudioRooms[roomId];
      return;
    }
    if (roomData.members.has(userId)) {
      // message body
      const leftUserDetails = roomData.membersDetails.filter(
        (member) => member._id == userId
      );
      let message: IRoomMessage = {
        name: leftUserDetails[0].name as string,
        avatar: leftUserDetails[0].avatar as string,
        uid: leftUserDetails[0].uid as string,
        country: leftUserDetails[0].country as string,
        _id: leftUserDetails[0]._id as string,
        text: "left the room",
        currentBackground: leftUserDetails[0].currentBackground as string,
        currentTag: leftUserDetails[0].currentTag as string,
        currentLevel: leftUserDetails[0].currentLevel as number,
        equipedStoreItems: leftUserDetails[0].equipedStoreItems,
      };
      // remove from seats
      if (
        !isEmptyObject(roomData.premiumSeat.member) &&
        (roomData.premiumSeat.member as IMemberDetails)._id == userId
      ) {
        roomData.premiumSeat.member = {};
        message.text = "left premiumSeat";
        socketResponse(this.io, SocketAudioChannels.SendMessage, roomId, {
          success: true,
          message: "Successfully left the seat",
          data: message,
        });
        socketResponse(this.io, SocketAudioChannels.leaveSeat, roomId, {
          success: true,
          message: "Successfully left the seat",
          data: {
            seatKey: "premiumSeat",
            member: {},
          },
        });
      }

      // remove from seats
      for (const [seatKey, seat] of Object.entries(roomData.seats)) {
        if (
          !isEmptyObject(seat.member) &&
          (seat.member as IMemberDetails)._id == userId
        ) {
          roomData.seats[seatKey].member = {};
          message.text = `left ${seatKey}`;
          socketResponse(this.io, SocketAudioChannels.SendMessage, roomId, {
            success: true,
            message: "Successfully left the seat",
            data: message,
          });
          socketResponse(this.io, SocketAudioChannels.leaveSeat, roomId, {
            success: true,
            message: "Successfully left the seat",
            data: {
              seatKey,
              member: {},
            },
          });
        }
      }

      // remove from muted
      if (roomData.mutedUsers.has(userId)) roomData.mutedUsers.delete(userId);
      // removing from members
      roomData.members.delete(userId);
      // removing from membersDetails
      roomData.membersDetails = roomData.membersDetails.filter(
        (member) => member._id.toString() !== userId
      );

      // send leave event
      socketResponse(this.io, SocketAudioChannels.userLeft, roomId, {
        success: true,
        message: "Successfully left the room",
        data: {
          _id: userId,
        },
      });
      socketResponse(this.io, SocketAudioChannels.SendMessage, roomId, {
        success: true,
        message: "Successfully left the room",
        data: message,
      });
      // remove from socket
      const socketId = this.onlineUsers.get(userId);
      if (socketId) {
        const getSocket = this.io.sockets.sockets.get(socketId);
        if (getSocket) {
          getSocket.leave(roomId);
        }
      }
    }
  }
}
