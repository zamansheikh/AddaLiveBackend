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
  ILaunchRocketInfo,
  IMemberDetails,
  IRoomMessage,
  ISearializedAudioRoom,
  RoomData,
} from "./interface/socket_interface";
import { registerAudioRoomHandler } from "./handlers/audio_room_handler";
import {
  getAudioUserSeat,
  isEmptyObject,
  socketResponse,
} from "../Utils/helper_functions";
import { GiftAudioRocketRepository } from "../../repository/gifts/gift_audio_rocket_repository";
import GiftAudioRoomRocketModel, {
  IGiftAudioRocket,
} from "../../models/gifts/gift_audio_rocket_model";
import AdminRepository from "../../repository/admin/admin_repository";
import Admin from "../../models/admin/admin_model";

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
  private adminRepo = new AdminRepository(Admin);
  private bucketRepo = new MyBucketRepository(MyBucketModel);
  private categoryRepo = new StoreCategoryRepository(StoreCategoryModel);
  // for rocket fetures
  private giftAudioRocketRepo = new GiftAudioRocketRepository(
    GiftAudioRoomRocketModel
  );
  private rocketInfo: Partial<IGiftAudioRocket> = {};
  private launchRocketInfo: Record<string, ILaunchRocketInfo> = {};

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

  public static async initialize(server: HttpServer): Promise<SocketServer> {
    if (!SocketServer.instance) {
      SocketServer.instance = new SocketServer(server);
    }
    this.instance.rocketInfo =
      await this.instance.giftAudioRocketRepo.getRocketInfoForAudioRoom();
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
        this.adminRepo,
        this.bucketRepo,
        this.categoryRepo
      );

      registerAudioRoomHandler(
        this.io,
        socket,
        this.onlineUsers,
        this.hostedAudioRooms,
        this.userRepo,
        this.adminRepo,
        this.bucketRepo,
        this.categoryRepo,
        this.rocketInfo,
        this.launchRocketInfo
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
          // // ! getting member details
          // const disconnectedUserDetails = roomData.membersDetails.filter(
          //   (member) => member._id.toString() === userId
          // );
          // // ! notifying the room that a user has been disconnected
          // this.io.to(roomId).emit(SocketChannels.UserConnection, {
          //   ...disconnectedUserDetails[0],
          //   roomId,
          //   roomType: RoomTypes.live,
          // });
          const timeOut = setTimeout(() => {
            this.disconnectedUsers.delete(userId);
            this.hanldeUserDisconnect(userId, roomId, roomData);
          }, 30000);
          this.disconnectedUsers.set(userId, { timeOut, roomId });
          socket.leave(roomId);
        }

        // persist audio room connection
        for (const [roomId, roomData] of Object.entries(
          this.hostedAudioRooms
        )) {
          if (!roomData.members.has(userId)) continue;
          // ! notifying the audio room that a user has been disconnected
          socketResponse(
            this.io,
            SocketAudioChannels.AudioUserConnection,
            roomId,
            {
              message: "User has been disconnected",
              success: true,
              data: {
                connected: false,
                id: userId,
                seat: getAudioUserSeat(userId, roomData),
              },
            }
          );
          const timeOut = setTimeout(() => {
            this.disconnectedUsers.delete(userId);
            this.handleAudioRoomDisconnect(userId, roomId, roomData);
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

  public updateRoomCoin(
    roomId: string,
    coin: number,
    targetUserIds: string[]
  ): void {
    const videoRoom: RoomData | undefined = this.hostedRooms[roomId];
    const audioRoom: IAudioRoomData | undefined = this.hostedAudioRooms[roomId];
    if (videoRoom) {
      const hasHostId = targetUserIds.filter((id) => id == videoRoom.hostId);
      if (hasHostId.length > 0) videoRoom.hostCoins += coin;
    }

    if (audioRoom) {
      const hasHostId = targetUserIds.filter(
        (id) => id == audioRoom.hostDetails?._id
      );
      if (hasHostId.length > 0) {
        audioRoom.hostBonus += coin;
        socketResponse(
          this.io,
          SocketAudioChannels.UpdateAudioHostCoins,
          audioRoom.roomId,
          {
            success: true,
            message: "Successfully updated host coins",
            data: {
              hostBonus: audioRoom.hostBonus,
            },
          }
        );
        if (isEmptyObject(this.rocketInfo)) return;

        const rocketFuel = this.rocketInfo.giftPercentage! * coin;
        const launchDetails = this.launchRocketInfo[audioRoom.roomId];

        // fuel milestone reset
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastResetDay = new Date(launchDetails.currentDay);
        lastResetDay.setHours(0, 0, 0, 0);

        if (lastResetDay < today) {
          launchDetails.currentDay = new Date();
          launchDetails.currentIterationIdx = 0;
        }

        // checking if cool down period is going on
        if (launchDetails.cooldownTill > new Date()) return;

        // when all the milestones are reached
        if (
          launchDetails.currentIterationIdx >=
          this.rocketInfo.milestones!.length
        )
          return;
        // when fuel is full
        if (
          audioRoom.currentRocketFuel + rocketFuel >
          this.rocketInfo.milestones![launchDetails.currentIterationIdx]
        ) {
          audioRoom.currentRocketFuel = 0;
          launchDetails.currentIterationIdx++;
          audioRoom.currentRocketMilestone =
            launchDetails.currentIterationIdx >=
            this.rocketInfo.milestones!.length
              ? 0
              : this.rocketInfo.milestones![launchDetails.currentIterationIdx];
          launchDetails.cooldownTill = new Date(
            Date.now() + this.rocketInfo.cooldown! * 1000
          );

          socketResponse(
            this.io,
            SocketAudioChannels.NewRocketFuelPercentage,
            audioRoom.roomId,
            {
              success: true,
              message: "Rocket fuel status",
              data: {
                percentage: 100,
              },
            }
          );

          socketResponse(
            this.io,
            SocketAudioChannels.LaunchRocket,
            audioRoom.roomId,
            {
              success: true,
              message: "Rocket is being launched",
              data: {
                launch: true,
              },
            }
          );
          return;
        }
        // when the fuel is incresed but not full
        audioRoom.currentRocketFuel += rocketFuel;

        socketResponse(
          this.io,
          SocketAudioChannels.NewRocketFuelPercentage,
          audioRoom.roomId,
          {
            success: true,
            message: "Rocket fuel status",
            data: {
              percentage:
                (audioRoom.currentRocketFuel /
                  audioRoom.currentRocketMilestone) *
                100,
            },
          }
        );
      }
    }
  }

  public updateRoomRanking(
    roomId: string,
    userId: string,
    gifts: number,
    targetUserIds: string[]
  ) {
    const videoRoom: RoomData | undefined = this.hostedRooms[roomId];
    const audioRoom: IAudioRoomData | undefined = this.hostedAudioRooms[roomId];
    if (videoRoom) {
      const hasHostId = targetUserIds.filter((id) => id == videoRoom.hostId);
      if (hasHostId.length > 0)
        for (let i = 0; i < videoRoom.ranking.length; i++) {
          if (videoRoom.ranking[i]._id.toString() === userId) {
            videoRoom.ranking[i].totalGiftSent! += gifts;
            break;
          }
        }
    }
    if (audioRoom) {
      const hasHostId = targetUserIds.filter(
        (id) => id == audioRoom.hostDetails?._id
      );
      if (hasHostId.length > 0)
        for (let i = 0; i < audioRoom.ranking.length; i++) {
          if (audioRoom.ranking[i]._id.toString() === userId) {
            audioRoom.ranking[i].totalGiftSent! += gifts;
            break;
          }
        }
    }
  }

  private handleUserConnect(userId: string, socket: Socket) {
    if (this.disconnectedUsers.has(userId)) {
      clearTimeout(this.disconnectedUsers.get(userId)?.timeOut);
      if (this.disconnectedUsers.get(userId)?.roomId) {
        // ? user reconnect message might fail if the room id is not there
        const userRoomId = this.disconnectedUsers.get(userId)?.roomId!;
        socket.join(userRoomId);
        const audioRoom: undefined | IAudioRoomData =
          this.hostedAudioRooms[userRoomId];
        const videoRoom: undefined | RoomData = this.hostedRooms[userRoomId];
        if (audioRoom) {
          // user reconect event trigger
          socketResponse(
            this.io,
            SocketAudioChannels.AudioUserConnection,
            userRoomId,
            {
              success: true,
              message: "User has been connected",
              data: {
                connected: true,
                id: userId,
                seat: getAudioUserSeat(userId, audioRoom),
              }
            });
        }
        
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

      const allRoomSerialized: ISearializedAudioRoom[] = [];

      for (const [room, roomData] of Object.entries(this.hostedAudioRooms)) {
        const obj = {
          title: roomData.title,
          numberOfSeats: roomData.numberOfSeats,
          currentRocketMilestone: roomData.currentRocketMilestone,
          currentRocketFuel: roomData.currentRocketFuel,
          fuelPercentage:
            roomData.currentRocketMilestone === 0
              ? 0
              : (roomData.currentRocketFuel / roomData.currentRocketMilestone) *
                100,
          roomId: roomData.roomId,
          hostGifts: roomData.hostGifts,
          hostBonus: roomData.hostBonus,
          hostDetails: roomData.hostDetails,
          premiumSeat: roomData.premiumSeat,
          seats: roomData.seats,
          messages: roomData.messages,
          createdAt: roomData.createdAt,
          members: Array.from(roomData.members),
          membersDetails: roomData.membersDetails,
          bannedUsers: Array.from(roomData.bannedUsers),
          mutedUsers: Array.from(roomData.mutedUsers),
          ranking: roomData.ranking,
          duration: Math.floor(
            (new Date().getTime() - roomData.createdAt.getTime()) / 1000
          ),
        };
        allRoomSerialized.push(obj);
      }

      this.io.emit(SocketAudioChannels.GetAllAudioRooms, {
        success: true,
        message: "Successfully room created",
        data: allRoomSerialized,
      });
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
