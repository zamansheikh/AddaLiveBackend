import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import AudioRoomModel, {
  IAudioRoom,
  IAudioRoomDocument,
  IRoomMessage,
} from "../../models/audio_room/audio_room_model";
import { AudioRoomRepository } from "../../repository/audio_room/audio_room_repository";
import UserRepository, {
  IUserRepository,
} from "../../repository/users/user_repository";
import { AudioRoomChannels, GlobalBannerTypes } from "../Utils/enums";
import MyBucketRepository, {
  IMyBucketRepository,
} from "../../repository/store/my_bucket_repository";
import StoreCategoryRepository, {
  IStoreCategoryRepository,
} from "../../repository/store/store_category_repository";
import { getEquippedItemObjects } from "../Utils/helper_functions";
import {
  ALLOWED_MESSAGES_COUNT,
  PERSISTENT_CONNECTION_TIMEOUT,
} from "../Utils/constants";
import User from "../../models/user/user_model";
import MyBucketModel from "../../models/store/my_bucket_model";
import StoreCategoryModel from "../../models/store/store_category_model";
import { CurrentRoomMemberRepository } from "../../repository/audio_room/current_room_member_repository";
import CurrentRoomMemberModel from "../../models/audio_room/current_room_member";
import { AudioRoomHelper } from "../helper_classes/audioRoomHelper";
import { UserCache } from "../cache/user_chache";
import RocketService from "../../services/audio_room/rocket_service";

export interface IOnlineUserBrief {
  _id: string;
  userId?: number;
  name?: string;
  email?: string;
  avatar?: string;
  socketId: string;
}

export default class SingletonSocketServer {
  private static instance: SingletonSocketServer;
  private io: Server;

  private onlineUsers = new Map<string, IOnlineUserBrief>(); // Map<userId, userBrief>
  private disconnectedUsers = new Map<
    string,
    { timeOut: NodeJS.Timeout; roomId?: string }
  >(); // Map<userId, socketId>

  // repositories
  private audioRoomRepository = new AudioRoomRepository(AudioRoomModel);
  private userRepository = new UserRepository(User);
  private bucketRepository = new MyBucketRepository(MyBucketModel);
  private categoryRepository = new StoreCategoryRepository(StoreCategoryModel);
  private currentRoomMemberRepository = new CurrentRoomMemberRepository(
    CurrentRoomMemberModel,
  );

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

  public static async initialize(
    server: HttpServer,
  ): Promise<SingletonSocketServer> {
    if (!SingletonSocketServer.instance) {
      SingletonSocketServer.instance = new SingletonSocketServer(server);
    }
    return SingletonSocketServer.instance;
  }

  public static getInstance(): SingletonSocketServer {
    if (!SingletonSocketServer.instance) {
      throw new Error(
        "SocketServer not initialized. Call initialize(server) first.",
      );
    }
    return SingletonSocketServer.instance;
  }

  private initialize() {
    this.io.on("connection", async (socket) => {
      const userId = socket.handshake.query.userId as string;
      if (userId) {
        await this.handleUserConnect(userId, socket);
      }

      // Send Audio Emoji
      socket.on(
        AudioRoomChannels.SendEmoji,
        ({
          roomId,
          seatKey,
          emoji,
        }: {
          roomId: string;
          seatKey: string;
          emoji: string;
        }) => {
          const room = this.io.sockets.adapter.rooms.get(roomId);
          console.log(room);
          if (!room) return;
          this.emitToRoom(roomId, AudioRoomChannels.SendEmoji, {
            seatKey,
            emoji,
            sender: userId,
          });
        },
      );

      socket.on("disconnect", async () => {
        // remove the users when disconnected from online users
        if (userId) {
          this.onlineUsers.delete(userId);
          console.log(`User ${userId} disconnected`);
        }
        // * persist audio room connection
        const room = await this.audioRoomRepository.isMemberInAnyRoom(userId);
        if (room) {
          const timeOut = setTimeout(async () => {
            this.disconnectedUsers.delete(userId);
            // Re-query the DB to get the current room state — the user may
            // have already left explicitly via the REST endpoint while this
            // timeout was pending, making the captured `room` stale.
            const currentRoom =
              await this.audioRoomRepository.isMemberInAnyRoom(userId);
            if (!currentRoom) return;
            this.handleAudioRoomDisconnection(userId, currentRoom);
          }, PERSISTENT_CONNECTION_TIMEOUT);
          this.disconnectedUsers.set(userId, { timeOut, roomId: room.roomId });
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

  public getOnlineUsersProfiles(page: number, limit: number): {
    pagination: { page: number; limit: number; total: number; totalPages: number };
    users: Partial<IOnlineUserBrief>[];
  } {
    const allUsers = Array.from(this.onlineUsers.values());
    const total = allUsers.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    
    const paginatedUsers = allUsers.slice(start, end).map(user => {
      // Exclude socketId for security
      const { socketId, ...safeUser } = user;
      return safeUser;
    });

    return {
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      users: paginatedUsers,
    };
  }

  public getSocketId(userId: string): string | undefined {
    return this.onlineUsers.get(userId)?.socketId;
  }

  public joinRoomSocket(userId: string, roomId: string) {
    const socketId = this.getSocketId(userId);
    if (socketId) {
      this.io.sockets.sockets.get(socketId)?.join(roomId);
    }
  }

  public leaveRoomSocket(userId: string, roomId: string) {
    const socketId = this.getSocketId(userId);
    if (socketId) {
      this.io.sockets.sockets.get(socketId)?.leave(roomId);
    }
  }

  public emitToUser(userId: string, event: string, data: any) {
    const socketId = this.getSocketId(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  public emitToRoom(roomId: string, event: string, data: any) {
    if (roomId == "") {
      this.io.emit(event, data);
    } else {
      this.io.to(roomId).emit(event, data);
    }
  }

  public emitToAll(event: string, data: any) {
    this.io.emit(event, data);
  }

  public emitGlobalRocketBanner({
    roomId,
    message,
    rocketLevel,
    roomPhoto,
  }: {
    roomId: string;
    message: string;
    rocketLevel: number;
    roomPhoto: string;
  }) {
    this.io.emit(AudioRoomChannels.GlobalBanner, {
      bannerType: GlobalBannerTypes.RocketBanner,
      roomId,
      message,
      rocketLevel,
      roomPhoto,
    });
  }

  public emitGlobalCoinBagBanner({
    roomId,
    coinAmount,
    senderPhoto,
    senderName,
  }: {
    roomId: string;
    coinAmount: number;
    senderPhoto: string;
    senderName: string;
  }) {
    this.io.emit(AudioRoomChannels.GlobalBanner, {
      bannerType: GlobalBannerTypes.CoinBagBanner,
      roomId,
      coinAmount,
      senderPhoto,
      senderName,
    });
  }

  public roomSearializer(room: IAudioRoom) {
    return {
      title: room.title,
      numberOfSeats: room.numberOfSeats,
      announcement: room.announcement,
      roomId: room.roomId,
      roomPhoto: room.roomPhoto,
      admins: room.admins,
      hostSeat: room.hostSeat,
      seats:
        room.seats instanceof Map ? Object.fromEntries(room.seats) : room.seats,
      messages: room.messages,
      members:
        room.members instanceof Map
          ? Object.fromEntries(room.members)
          : room.members,
      membersArray: room.membersArray,
      bannedUsers: room.bannedUsers,
      mutedUsers:
        room.mutedUsers instanceof Map
          ? Object.fromEntries(room.mutedUsers)
          : room.mutedUsers,
      chatPrivacy: room.chatPrivacy,
      allowedUsersToChat:
        room.allowedUsersToChat instanceof Map
          ? Object.fromEntries(room.allowedUsersToChat)
          : room.allowedUsersToChat,
      password: room.password,
      isHostPresent: room.isHostPresent,
      isLocked: room.isLocked,
      hostId: room.hostId,
      membersCount: room.membersCount ?? room.membersArray?.length ?? 0,
    };
  }

  public roomDataSerializer(room: IAudioRoom) {
    return {
      title: room.title,
      numberOfSeats: room.numberOfSeats,
      announcement: room.announcement,
      roomId: room.roomId,
      roomPhoto: room.roomPhoto,
      admins: room.admins,
      hostSeat: room.hostSeat,
      seats:
        room.seats instanceof Map ? Object.fromEntries(room.seats) : room.seats,
      bannedUsers: room.bannedUsers,
      mutedUsers:
        room.mutedUsers instanceof Map
          ? Object.fromEntries(room.mutedUsers)
          : room.mutedUsers,
      chatPrivacy: room.chatPrivacy,
      allowedUsersToChat:
        room.allowedUsersToChat instanceof Map
          ? Object.fromEntries(room.allowedUsersToChat)
          : room.allowedUsersToChat,
      password: room.password,
      isHostPresent: room.isHostPresent,
      isLocked: room.isLocked,
      hostId: room.hostId,
      membersCount:
        room.membersCount ?? (room.membersArray ? room.membersArray.length : 0),
    };
  }

  private async handleUserConnect(userId: string, socket: Socket) {
    // Register the socket synchronously BEFORE any await. A REST call
    // (e.g. join-audio-room) landing mid-handshake relies on getSocketId()
    // to put this socket into the room — if onlineUsers is set after the
    // DB await, joinRoomSocket silently no-ops and no broadcasts reach the
    // client until it reconnects.
    this.onlineUsers.set(userId, { socketId: socket.id, _id: userId });

    UserCache.getInstance().getUserBrief(userId).then(brief => {
      if (brief && this.onlineUsers.has(userId) && this.onlineUsers.get(userId)?.socketId === socket.id) {
        this.onlineUsers.set(userId, {
          socketId: socket.id,
          _id: brief._id,
          userId: brief.userId,
          name: brief.name,
          email: brief.email,
          avatar: brief.avatar,
        });
      }
    }).catch(err => console.error("Error hydrating user socket", err));
    if (this.disconnectedUsers.has(userId)) {
      const { timeOut, roomId } = this.disconnectedUsers.get(userId)!;
      clearTimeout(timeOut);
      this.disconnectedUsers.delete(userId);
      if (roomId) {
        socket.join(roomId);
      }
    } else {
      const room = await this.audioRoomRepository.isMemberInAnyRoom(userId);
      if (room) {
        socket.join(room.roomId);
      }
    }
    console.log(`User ${userId} connected with socket ID: ${socket.id}`);
  }

  // this function here instead of being in the audio helper
  //  because its more convinent to handle the room logic here`
  // and when i wrote it here, i didnt have the audio helper
  // its a drag to move it there, if you think I am lazy, then I am
  // you can move it there if you want, but I dont think its necessary
  //  at least for me
  //  Also because this function extensivly uses the socket server
  public async handleAudioRoomDisconnection(
    userId: string,
    room: IAudioRoomDocument,
  ) {
    try {
      const helperInstance = AudioRoomHelper.getInstance();
      const isHost = room.hostId?.toString() === userId;
      const isMember = room.members.has(userId);

      if (!isHost && !isMember) {
        return room;
      }

      const userObj = await helperInstance.prepareUserData(userId);

      // remove text-bubble from leave message
      if (userObj.equippedStoreItems && userObj.equippedStoreItems["text-bubble"]) {
        delete userObj.equippedStoreItems["text-bubble"];
      }

      // leave message
      const leaveMessage: IRoomMessage = helperInstance.generateRoomMessage(
        userObj,
        "left the room",
      );

      const updateQuery: any = {
        $set: {},
        $unset: {},
        $pull: { membersArray: userId },
        $push: {
          messages: {
            $each: [leaveMessage],
            $slice: -ALLOWED_MESSAGES_COUNT,
          },
        },
      };

      // 1. Remove from host seat if applicable
      if (isHost && room.hostSeat?.member?._id?.toString() === userId) {
        updateQuery.$unset["hostSeat.member"] = 1;
        this.emitToRoom(room.roomId, AudioRoomChannels.AudioSeatLeft, {
          seatKey: "hostSeat",
          member: {},
        });
      }

      // 2. Remove from regular seats
      for (const [seatKey, seat] of room.seats.entries()) {
        if (seat.member?._id?.toString() === userId) {
          updateQuery.$unset[`seats.${seatKey}.member`] = 1;
          this.emitToRoom(room.roomId, AudioRoomChannels.AudioSeatLeft, {
            seatKey: seatKey,
            member: {},
          });
        }
      }

      // 3. Remove from members Map
      updateQuery.$unset[`members.${userId}`] = 1;

      // 4. Handle host presence
      if (isHost) {
        updateQuery.$set.isHostPresent = false;
      }

      // 5. Handle muted users
      if (room.mutedUsers.has(userId)) {
        updateQuery.$unset[`mutedUsers.${userId}`] = 1;
        this.emitToRoom(room.roomId, AudioRoomChannels.muteUnmuteUser, {
          mutedUsers: Array.from(room.mutedUsers.keys()).filter(
            (id) => id !== userId,
          ),
        });
      }

      // 6. Emissions
      this.emitToRoom(room.roomId, AudioRoomChannels.AudioRoomMessage, {
        message: leaveMessage,
      });

      this.emitToRoom(room.roomId, AudioRoomChannels.UserLeft, {
        userId: userId,
        ...(isHost ? { isHostPresent: false } : {}),
      });

      // 7. Check if room is empty
      const stillHasMembers = room.membersArray.some(
        (m) => m.toString() !== userId,
      );
      if (!stillHasMembers) {
        updateQuery.$set.isActive = false;
        this.emitToRoom("", AudioRoomChannels.AudioRoomClosed, {
          roomId: room.roomId,
        });
        // Clean up rocket Redis state since no one is in the room anymore
        RocketService.getInstance().cleanupRoomRocketState(room.roomId).catch(err =>
          console.error(`[RocketService] Failed to cleanup state for room ${room.roomId}:`, err)
        );
      }

      // 8. Socket leave
      const socketId = this.getSocketId(userId);
      if (socketId) {
        this.io.sockets.sockets.get(socketId)?.leave(room.roomId);
      }

      // Final cleanup of query object
      if (Object.keys(updateQuery.$set).length === 0) delete updateQuery.$set;
      if (Object.keys(updateQuery.$unset).length === 0)
        delete updateQuery.$unset;

      const updatedRoom = await AudioRoomModel.findOneAndUpdate(
        { _id: room._id },
        updateQuery,
        { new: true },
      );

      return updatedRoom || room;
    } catch (error) {
      console.log("Error in handleAudioRoomDisconnection", error);
      return room;
    }
  }
}
