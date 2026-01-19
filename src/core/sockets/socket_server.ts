// src/core/sockets/socket_server.ts

import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { registerGroupRoomHandler } from "./handlers/group_room_handler";
import {
  LaunchGiftTypes,
  RoomTypes,
  SocketAudioChannels,
  SocketChannels,
} from "../Utils/enums";
import UserRepository from "../../repository/users/user_repository";
import User from "../../models/user/user_model";
import { IUserDocument } from "../../models/user/user_model_interface";
import mongoose, { Error } from "mongoose";
import MyBucketRepository from "../../repository/store/my_bucket_repository";
import MyBucketModel, { IMyBucket } from "../../models/store/my_bucket_model";
import StoreCategoryRepository from "../../repository/store/store_category_repository";
import StoreCategoryModel from "../../models/store/store_category_model";
import {
  IAudioRoomData,
  ILaunchGifts,
  ILaunchRocketInfo,
  IMemberDetails,
  IRewarededUser,
  IRoomMessage,
  IRoomSupportHistory,
  IRoomXPData,
  ISearializedAudioRoom,
  RoomData,
} from "./interface/socket_interface";
import { registerAudioRoomHandler } from "./handlers/audio_room_handler";
import {
  getAudioUserSeat,
  getRandomNumberFromRange,
  isEmptyObject,
  socketResponse,
  updateUserXpFunc,
} from "../Utils/helper_functions";
import { GiftAudioRocketRepository } from "../../repository/gifts/gift_audio_rocket_repository";
import GiftAudioRoomRocketModel, {
  IGiftAudioRocket,
} from "../../models/gifts/gift_audio_rocket_model";
import AdminRepository from "../../repository/admin/admin_repository";
import Admin from "../../models/admin/admin_model";
import { BlockedEmailRepository } from "../../repository/security/blockedEmailRepository";
import BlockedEmailModel from "../../models/security/blocked_emails";
import { CursorTimeoutMode } from "mongodb";
import {
  COIN_MAX,
  COIN_MIN,
  REWARD_NUMBERS,
  ROCKET_MILESTONES,
  ROOM_LEVEL_CRITERIA,
  XP_MAX,
  XP_MIN,
} from "../Utils/constants";
import StoreItemRepository from "../../repository/store/store_item_repository";
import StoreItemModel, {
  IStoreItem,
  IStoreItemDocument,
} from "../../models/store/store_item_model";
import { log } from "console";
import UserStats from "../../models/userstats/userstats_model";
import UserStatsRepository from "../../repository/users/userstats_repository";

export default class SocketServer {
  private static instance: SocketServer;
  private io: Server;
  private onlineUsers = new Map<string, string>(); // Map<userId, socketId>
  private disconnectedUsers = new Map<
    string,
    { timeOut: NodeJS.Timeout; roomId?: string }
  >(); // Map<userId, socketId>
  private hostedRooms = {} as Record<string, RoomData>; //roomid : roomdata
  public hostedAudioRooms = {} as Record<string, IAudioRoomData>; //roomid : roomdata
  private audioRoomVisitedHistory = {} as Record<
    string,
    Record<string, string>
  >; // eg. {userId: {roomId: lastVisited}}
  public roomXpTrackingSystem = {} as Record<string, IRoomXPData>; // eg. {userId: {RoomXpData}}
  public roomSupportHistory = {} as Record<string, IRoomSupportHistory>; // eg. {roomId: IRoomSupportHistory};
  private blockedEmailRepository = new BlockedEmailRepository(
    BlockedEmailModel,
  );
  public userRepo = new UserRepository(User);
  public userStatsRepo = new UserStatsRepository(UserStats);
  private adminRepo = new AdminRepository(Admin);
  private bucketRepo = new MyBucketRepository(MyBucketModel);
  private categoryRepo = new StoreCategoryRepository(StoreCategoryModel);
  private storeItemRepository = new StoreItemRepository(StoreItemModel);

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
    return SocketServer.instance;
  }

  public static getInstance(): SocketServer {
    if (!SocketServer.instance) {
      throw new Error(
        "SocketServer not initialized. Call initialize(server) first.",
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

      // Register handlers for specific events

      registerGroupRoomHandler(
        this.io,
        socket,
        this.onlineUsers,
        this.hostedRooms,
        this.userRepo,
        this.adminRepo,
        this.bucketRepo,
        this.categoryRepo,
        this.blockedEmailRepository,
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
        this.blockedEmailRepository,
        this.audioRoomVisitedHistory,
        this.roomXpTrackingSystem,
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
          this.hostedAudioRooms,
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
            },
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

  public async updateRoomCoin(
    roomId: string,
    coin: number,
    targetUserIds: string[],
  ): Promise<void> {
    const videoRoom: RoomData | undefined = this.hostedRooms[roomId];
    const audioRoom: IAudioRoomData | undefined = this.hostedAudioRooms[roomId];
    if (videoRoom) {
      const hasHostId = targetUserIds.filter((id) => id == videoRoom.hostId);
      if (hasHostId.length > 0) videoRoom.hostCoins += coin;
    }

    if (audioRoom) {
      const hasHostId = targetUserIds.filter(
        (id) => id == audioRoom.hostDetails?._id,
      );
      if (hasHostId.length > 0) {
        audioRoom.hostBonus += coin;
      }
      const totalCoins = coin * targetUserIds.length;
      audioRoom.roomTotalTransaction += totalCoins;

      // Room level up condition check
      const currentLevelCriteria = ROOM_LEVEL_CRITERIA[audioRoom.roomLevel];
      if (
        audioRoom.uniqueUsers.size >= currentLevelCriteria.roomVisitor &&
        audioRoom.roomTotalTransaction >= currentLevelCriteria.roomTransactions
      ) {
        // increase the level
        audioRoom.roomLevel++;
        // send level up event to the room
        socketResponse(this.io, SocketAudioChannels.RoomLevelUp, roomId, {
          success: true,
          message: "Successfully room level up",
          data: {
            roomLevel: audioRoom.roomLevel,
          },
        });
      }

      // rocket fuel update
      await this.addFuelToRocket(roomId, totalCoins);

      socketResponse(
        this.io,
        SocketAudioChannels.UpdateAudioHostCoins,
        audioRoom.roomId,
        {
          success: true,
          message: "Successfully updated host coins",
          data: {
            hostBonus: audioRoom.hostBonus,
            roomTotalTransaction: audioRoom.roomTotalTransaction,
          },
        },
      );
    }
  }

  public updateRoomRanking(
    roomId: string,
    userId: string,
    gifts: number,
    targetUserIds: string[],
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
      for (let i = 0; i < audioRoom.ranking.length; i++) {
        if (audioRoom.ranking[i]._id.toString() === userId) {
          audioRoom.ranking[i].totalGiftSent! += gifts;
          break;
        }
      }
    }
  }

  public async addFuelToRocket(roomId: string, fuel: number) {
    const room = this.hostedAudioRooms[roomId];
    if (!room) return;
    if (room.currentRocketMilestone <= room.currentRocketFuel + fuel) {
      await this.launchRocket(roomId, fuel);
      return;
    }
    room.currentRocketFuel += fuel;
    socketResponse(
      this.io,
      SocketAudioChannels.NewRocketFuelPercentage,
      roomId,
      {
        success: true,
        message: "Successfully updated rocket fuel",
        data: {
          currentRocketFuel: room.currentRocketFuel,
          currentRocketFuelPercentage:
            room.currentRocketFuel / room.currentRocketMilestone,
        },
      },
    );
  }

  public async launchRocket(roomId: string, fuel: number) {
    const room = this.hostedAudioRooms[roomId];
    if (!room) return;
    let remainingFuel =
      room.currentRocketFuel + fuel - room.currentRocketMilestone;

    // reward mechanism
    const rewardedUsers = await this.rewardUsersUponLaunch(
      room.currentRocketLevel,
      roomId,
    );

    // notifying the app about the rocket launch
    for (const [id, data] of Object.entries(this.hostedAudioRooms)) {
      socketResponse(this.io, SocketAudioChannels.LaunchRocket, id, {
        success: true,
        message: "Rocket is about to be launched",
        data: {
          roomId: roomId,
          rewardedUsers,
        },
      });
    }

    // update the rocket informations
    room.currentRocketMilestone = ROCKET_MILESTONES[room.currentRocketLevel];
    room.currentRocketLevel += 1;
    room.currentRocketFuel = 0;
    socketResponse(this.io, SocketAudioChannels.NewRocketLevel, roomId, {
      success: true,
      message: "Successfully rocket leveled up",
      data: {
        currentRocketLevel: room.currentRocketLevel,
        currentRocketMilestone: room.currentRocketMilestone,
      },
    });

    // recursive call to tackle multiple launch
    if (room.currentRocketMilestone <= remainingFuel) {
      this.launchRocket(roomId, remainingFuel);
      return;
    }
    // fuel notification
    room.currentRocketFuel = remainingFuel;
    socketResponse(
      this.io,
      SocketAudioChannels.NewRocketFuelPercentage,
      roomId,
      {
        success: true,
        message: "Successfully updated rocket fuel",
        data: {
          currentRocketFuel: room.currentRocketFuel,
          currentRocketFuelPercentage:
            room.currentRocketFuel / room.currentRocketMilestone,
        },
      },
    );
  }

  public async rewardUsersUponLaunch(
    rocketLevel: number,
    roomId: string,
  ): Promise<IRewarededUser[]> {
    let rewardableUserCount = REWARD_NUMBERS[rocketLevel - 1];
    const room = this.hostedAudioRooms[roomId];
    if (!room) return [];
    room.ranking.sort((a, b) => {
      return b.totalGiftSent! - a.totalGiftSent!;
    });
    // adjusting for users
    if (rewardableUserCount > room.ranking.length)
      rewardableUserCount = room.ranking.length;
    const rewardedUsers: IRewarededUser[] = [];
    // distribute rewards to everyone in the room
    for (let i = 0; i < rewardableUserCount; i++) {
      const rewards: ILaunchGifts[] = [];
      // for top 1 -> add asset
      if (i == 0) {
        const asset = await this.addAssetToUser(
          room.ranking[i]._id.toString(),
          4,
        );
        const rewardObj: ILaunchGifts = {
          quantity: 4,
          thumbnail: asset,
          type: LaunchGiftTypes.Assets,
        };
        rewards.push(rewardObj);
      }

      // for top 1 and 2 -> add asset
      if (i < 2) {
        const asset = await this.addAssetToUser(
          room.ranking[i]._id.toString(),
          3,
        );
        const rewardObj: ILaunchGifts = {
          quantity: 3,
          thumbnail: asset,
          type: LaunchGiftTypes.Assets,
        };
        rewards.push(rewardObj);
      }

      // for top 1 to 3 -> add Xp
      if (i < 3) {
        const xp = await this.addXpToUser(room.ranking[i]._id.toString());
        const rewardObj: ILaunchGifts = {
          quantity: xp,
          thumbnail: "XP",
          type: LaunchGiftTypes.XP,
        };
        rewards.push(rewardObj);
      }

      //  add coins
      const coins = await this.addCoinsToUser(room.ranking[i]._id.toString());
      const rewardGiftObj: ILaunchGifts = {
        quantity: coins,
        thumbnail: "Coins",
        type: LaunchGiftTypes.Coins,
      };
      rewards.push(rewardGiftObj);
      const rewardedUser: IRewarededUser = {
        ...room.ranking[i],
        gifts: rewards,
      };
      rewardedUsers.push(rewardedUser);
    }
    return rewardedUsers;
  }
  // this function adds asset to the
  private async addAssetToUser(
    targetUserId: string,
    duration: number,
  ): Promise<string> {
    // select a random category
    const categories: { _id: string; name: string }[] = (
      await this.categoryRepo.getAllCategories()
    )
      .filter((obj) => obj.isPremium != true)
      .map((obj) => ({ _id: obj._id, name: obj.title })) as {
      _id: string;
      name: string;
    }[];
    const randomCategory: { _id: string; name: string } =
      categories[Math.floor(Math.random() * categories.length)];
    // select a random item
    const items = await this.storeItemRepository.getAllStoreItemByCategory(
      randomCategory._id,
    );
    const randomItem: IStoreItemDocument = items[
      Math.floor(Math.random() * items.length)
    ] as IStoreItemDocument;

    // add the item to users bucket
    const bucket: IMyBucket = {
      categoryId: randomCategory._id,
      itemId: randomItem._id as string,
      ownerId: targetUserId,
      expireAt: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
    };
    // return the category if success else error for reference
    try {
      await this.bucketRepo.createNewBucket(bucket);
      return randomCategory.name;
    } catch (error) {
      console.log(error);
      return "error";
    }
  }

  // this function adds xp to user
  private async addXpToUser(targetUserId: string): Promise<number> {
    const xpAmount = getRandomNumberFromRange(XP_MIN, XP_MAX);
    await updateUserXpFunc(this.userRepo, targetUserId, xpAmount, this.io);
    return xpAmount;
  }

  private async addCoinsToUser(targetUserId: string): Promise<number> {
    const coins = getRandomNumberFromRange(COIN_MIN, COIN_MAX);
    const user = await this.userRepo.findUserById(targetUserId);
    if (!user) return 0;
    const userStats = await this.userStatsRepo.updateCoins(targetUserId, coins);
    if (!userStats) return 0;
    return coins;
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
              },
            },
          );
        }
      }
      this.disconnectedUsers.delete(userId);
    }
    this.onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} connected with socket ID: ${socket.id}`);
  }

  public hanldeUserDisconnect(
    userId: string,
    roomId: string,
    roomData: RoomData,
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
          (broadcaster) => broadcaster._id.toString() !== userId,
        );
        this.io
          .to(roomId)
          .emit(
            SocketChannels.broadcasterList,
            Array.from(roomData.broadcastersDetails),
          );
      }
      const objectToDelete = Array.from(roomData.callRequests).find(
        (request) => request._id.toString() === userId,
      );
      if (objectToDelete) {
        roomData.callRequests.delete(objectToDelete);
        this.io
          .to(roomId)
          .emit(
            SocketChannels.joinCallReqList,
            Array.from(roomData.callRequests),
          );
      }
      roomData.members.delete(userId);
      const userDetails = roomData.membersDetails.filter(
        (member) => member._id.toString() == userId,
      );
      roomData.membersDetails = roomData.membersDetails.filter(
        (member) => member._id.toString() !== userId,
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

  public handleAudioRoomDisconnect(
    userId: string,
    roomId: string,
    roomData: IAudioRoomData,
  ) {
    const isPersistRoom =
      process.env.ROOM_PERSIST && process.env.ROOM_PERSIST == "1";

    if (
      !isPersistRoom &&
      (roomData.hostDetails as IMemberDetails)._id == userId
    ) {
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
          announcement: roomData.announcement,
          roomId: roomData.roomId,
          currentRocketFuel: roomData.currentRocketFuel,
          currentRocketLevel: roomData.currentRocketLevel,
          currentRocketMilestone: roomData.currentRocketMilestone,
          roomTotalTransaction: roomData.roomTotalTransaction,
          rocketFuelPercentage: Math.floor(
            roomData.currentRocketFuel / roomData.currentRocketMilestone,
          ),
          hostGifts: roomData.hostGifts,
          hostBonus: roomData.hostBonus,
          hostDetails: roomData.hostDetails,
          adminDetails: roomData.adminDetails,
          premiumSeat: roomData.premiumSeat,
          seats: roomData.seats,
          messages: roomData.messages,
          createdAt: roomData.createdAt,
          members: Array.from(roomData.members),
          membersDetails: roomData.membersDetails,
          bannedUsers: Array.from(roomData.bannedUsers),
          mutedUsers: Array.from(roomData.mutedUsers),
          ranking: roomData.ranking,
          chatPrivacy: roomData.chatPrivacy,
          duration: Math.floor(
            (new Date().getTime() - roomData.createdAt.getTime()) / 1000,
          ),
          isHostPresent: roomData.isHostPresent,
          isLocked: roomData.isLocked,
          roomLevel: roomData.roomLevel,
          roomPartners: roomData.roomPartners,
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

    // if host left in persisted audio room
    if (
      isPersistRoom &&
      (roomData.hostDetails as IMemberDetails)._id == userId
    ) {
      let message: IRoomMessage = {
        name: roomData.hostDetails!.name as string,
        avatar: roomData.hostDetails!.avatar as string,
        uid: roomData.hostDetails!.uid as string,
        userId: roomData.hostDetails!.userId as number,
        country: roomData.hostDetails!.country as string,
        _id: roomData.hostDetails!._id as string,
        text: "left the room",
        currentBackground: roomData.hostDetails!.currentBackground as string,
        currentTag: roomData.hostDetails!.currentTag as string,
        currentLevel: roomData.hostDetails!.currentLevel as number,
        equipedStoreItems: roomData.hostDetails!.equipedStoreItems,
      };
      socketResponse(this.io, SocketAudioChannels.SendMessage, roomId, {
        success: true,
        message: "Successfully left the seat",
        data: message,
      });
      socketResponse(this.io, SocketAudioChannels.leaveSeat, roomId, {
        success: true,
        message: "host left the room",
        data: {
          seatKey: "hostDetails",
          member: {},
        },
      });

      roomData.isHostPresent = false;
      roomData.members.delete(userId);

      const socketId = this.onlineUsers.get(userId);
      if (socketId) {
        const getSocket = this.io.sockets.sockets.get(socketId);
        if (getSocket) {
          getSocket.leave(roomId);
        }
      }
      return;
    }

    // if the left person is not the host

    if (roomData.members.has(userId)) {
      // message body

      const leftUserDetails = roomData.membersDetails.filter(
        (member) => member._id == userId,
      );
      let message: IRoomMessage = {
        name: leftUserDetails[0].name as string,
        avatar: leftUserDetails[0].avatar as string,
        uid: leftUserDetails[0].uid as string,
        userId: leftUserDetails[0].userId as number,
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
        (member) => member._id.toString() !== userId,
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

  public getRoomSupportHistory(roomId: string): IRoomSupportHistory {
    if (this.roomSupportHistory[roomId]) return this.roomSupportHistory[roomId];
    return {
      rewardCoin: 0,
      roomLevel: 0,
      roomTransactions: 0,
      roomVisitors: 0,
    };
  }
}
