import AppError from "../../core/errors/app_errors";
import RocketService, {
  IRewarededUser,
  IRocketServiceResponse,
} from "./rocket_service";
import { isValidObjectId } from "mongoose";
import SingletonSocketServer from "../../core/sockets/singleton_socket_server";
import { AudioRoomHelper } from "../../core/helper_classes/audioRoomHelper";
import {
  ALLOWED_MESSAGES_COUNT,
  ROCKET_MILESTONES,
} from "../../core/Utils/constants";
import {
  ActivityZoneState,
  AudioRoomChannels,
  RankingPeriods,
} from "../../core/Utils/enums";
import { getEquippedItemObjects } from "../../core/Utils/helper_functions";
import {
  IAudioRoom,
  IAudioRoomDocument,
  IAudioSeat,
  IMemberDetails,
  IRoomMessage,
} from "../../models/audio_room/audio_room_model";
import { IAudioRoomRepository } from "../../repository/audio_room/audio_room_repository";
import { IMyBucketRepository } from "../../repository/store/my_bucket_repository";
import { IStoreCategoryRepository } from "../../repository/store/store_category_repository";
import { IUserRepository } from "../../repository/users/user_repository";
import { IRecentVisitedRoomRepository } from "../../repository/audio_room/recent_visited_room_reposiory";
import { RepositoryProviders } from "../../core/providers/repository_providers";
import { IRanking } from "../../repository/gifts/gift_record_repository";
import PrivilegeService from "../store/privilege_service";

export interface IAudioRoomService {
  createAudioRoom(audioRoom: Partial<IAudioRoom>): Promise<IAudioRoomDocument>;
  getAudioRoomById(roomId: string): Promise<IAudioRoomDocument | null>;
  getAllAudioRooms(): Promise<IAudioRoomDocument[]>;
  fetchAllRooms(): Promise<IAudioRoomDocument[]>;
  fetchActiveRooms(): Promise<IAudioRoomDocument[]>;
  fetchLockedRooms(): Promise<IAudioRoomDocument[]>;
  joinAudioRoom(
    roomId: string,
    userId: string,
    password?: string,
  ): Promise<IAudioRoomDocument>;
  joinAudioSeat(
    userId: string,
    roomId: string,
    seatKey: string,
  ): Promise<IAudioRoomDocument>;
  leaveAudioSeat(
    userId: string,
    roomId: string,
    seatKey: string,
  ): Promise<IAudioRoomDocument>;
  makeAudioAdmin(
    myId: string,
    targetId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument>;
  removeAudioAdmin(
    myId: string,
    targetId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument>;
  removeFromSeat(
    myId: string,
    targetId: string,
    roomId: string,
    seatKey: string,
  ): Promise<IAudioRoomDocument>;
  muteUnmuteUser(
    myId: string,
    targetId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument>;
  muteUnmuteSeat(
    myId: string,
    roomId: string,
    seatKey: string,
  ): Promise<IAudioRoomDocument>;
  leaveAudioRoom(userId: string, roomId: string): Promise<IAudioRoomDocument>;
  sendRoomWideMessage(
    myId: string,
    roomId: string,
    message: string,
  ): Promise<IAudioRoomDocument>;
  lockUnlockSeat(
    myId: string,
    roomId: string,
    seatKey: string,
  ): Promise<IAudioRoomDocument>;
  updateRoomTitle(
    myId: string,
    roomId: string,
    title: string,
  ): Promise<IAudioRoomDocument>;
  updateRoomAnnouncement(
    myId: string,
    roomId: string,
    announcement: string,
  ): Promise<IAudioRoomDocument>;
  updateRoomPhoto(
    myId: string,
    roomId: string,
    roomPhoto: string,
  ): Promise<IAudioRoomDocument>;
  clearChat(myId: string, roomId: string): Promise<IAudioRoomDocument>;
  searchAudioRoom(userId: number): Promise<IAudioRoomDocument>;
  getMyAudioRoom(myId: string): Promise<IAudioRoomDocument>;
  lockAllSeats(myId: string, roomId: string): Promise<IAudioRoomDocument>;
  unlockAllSeats(myId: string, roomId: string): Promise<IAudioRoomDocument>;
  banUser(
    myId: string,
    targetId: string,
    roomId: string,
    banType: ActivityZoneState,
    bannedTill?: string,
  ): Promise<IAudioRoomDocument>;
  unbanUser(
    myId: string,
    targetId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument>;
  banFromChat(
    myId: string,
    targetId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument>;
  unbanFromChat(
    myId: string,
    targetId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument>;
  updateRoomPassword({
    myId,
    roomId,
    password,
  }: {
    myId: string;
    roomId: string;
    password: string;
  }): Promise<IAudioRoomDocument>;
  updateSeatCount(
    myId: string,
    roomId: string,
    seatCount: number,
  ): Promise<IAudioRoomDocument>;
  setChatPrivacy(
    myId: string,
    roomId: string,
    chatPrivacy: "any" | "none" | string[],
  ): Promise<IAudioRoomDocument>;
  getMyRecentVisitedRooms(myId: string): Promise<IAudioRoomDocument[]>;
  getRoomVisitors(roomId: string): Promise<IMemberDetails[]>;
  getRoomMessages(roomId: string): Promise<IRoomMessage[]>;
  getRocketInfo(roomId: string): Promise<IRocketServiceResponse>;
  getInsideRoomRanking(
    myId: string,
    roomId: string,
    period: RankingPeriods,
  ): Promise<any>;
  getRewardedUsers(roomId: string): Promise<IRewarededUser[] | null>;
}

export class AudioRoomService implements IAudioRoomService {
  audioRoomRepository: IAudioRoomRepository;
  userRepository: IUserRepository;
  bucketRepository: IMyBucketRepository;
  categoryRepository: IStoreCategoryRepository;
  recentVisitedRoomRepository: IRecentVisitedRoomRepository;
  constructor(
    audioRoomRepository: IAudioRoomRepository,
    userRepository: IUserRepository,
    bucketRepository: IMyBucketRepository,
    categoryRepository: IStoreCategoryRepository,
    recentVisitedRoomRepository: IRecentVisitedRoomRepository,
  ) {
    this.audioRoomRepository = audioRoomRepository;
    this.userRepository = userRepository;
    this.bucketRepository = bucketRepository;
    this.categoryRepository = categoryRepository;
    this.recentVisitedRoomRepository = recentVisitedRoomRepository;
  }

  async createAudioRoom(
    audioRoom: Partial<IAudioRoom>,
  ): Promise<IAudioRoomDocument> {
    const { hostId, title, roomId, numberOfSeats, announcement, roomPhoto } =
      audioRoom;
    const existingRoom = await this.audioRoomRepository.checkRoomExisistance(
      roomId!,
    );
    // client side data validation
    if (existingRoom) {
      throw new AppError(400, "Room already exists");
    }
    const user = await this.userRepository.findUserById(hostId! as string);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    // prepare seats data
    const seats: Map<string, IAudioSeat> = new Map();
    for (let i = 1; i <= numberOfSeats!; i++) {
      seats.set(`seat-${i}`, { available: true, isMute: false });
    }

    // create audio room
    const audioRoomDocument: IAudioRoom = {
      title: title!,
      numberOfSeats: numberOfSeats!,
      announcement: announcement!,
      roomId: roomId!,
      roomPhoto: roomPhoto!,
      admins: [],
      hostSeat: { available: true, isMute: false },
      seats: seats,
      messages: [],
      members: new Map([[hostId!.toString(), true]]),
      membersArray: [hostId!],
      bannedUsers: [],
      mutedUsers: new Map(),
      chatPrivacy: "any",
      allowedUsersToChat: new Map(),
      password: "",
      isHostPresent: true,
      isLocked: false,
      isActive: true,
      hostId: hostId!,
      bannedFromMessages: [],
    };

    //socket instance
    const socketInstance = SingletonSocketServer.getInstance();
    // include the users socket to the roomId socket.join(roomId);
    socketInstance.joinRoomSocket(hostId! as string, roomId!);
    // send create room event
    socketInstance.emitToAll(
      AudioRoomChannels.NewAudioRoomCreated,
      socketInstance.roomSearializer(audioRoomDocument),
    );

    // save audio room
    const created =
      await this.audioRoomRepository.createAudioRoom(audioRoomDocument);

    // parallel operations for tracking and presence
    await Promise.all([
      this.recentVisitedRoomRepository.create({
        userId: hostId! as string,
        roomId: roomId!,
      }),
      AudioRoomHelper.getInstance().addUniqueUserToRoomSupport(
        roomId!,
        hostId! as string,
      ),
      AudioRoomHelper.getInstance().handleRoomPresence(
        hostId! as string,
        roomId!,
      ),
    ]);

    return await this.audioRoomRepository.getAudioRoomById(created.roomId);
  }
  async getAudioRoomById(roomId: string): Promise<IAudioRoomDocument | null> {
    const result = await this.audioRoomRepository.getAudioRoomById(roomId);
    if (!result) {
      throw new AppError(404, "Audio room not found");
    }
    return result;
  }

  async getAllAudioRooms(): Promise<IAudioRoomDocument[]> {
    const result = await this.audioRoomRepository.getAllAudioRooms();
    return result;
  }

  async fetchAllRooms(): Promise<IAudioRoomDocument[]> {
    return await this.audioRoomRepository.findAllRooms();
  }

  async fetchActiveRooms(): Promise<IAudioRoomDocument[]> {
    return await this.audioRoomRepository.findActiveRooms();
  }

  async fetchLockedRooms(): Promise<IAudioRoomDocument[]> {
    return await this.audioRoomRepository.findLockedRooms();
  }

  async joinAudioRoom(
    roomId: string,
    userId: string,
    password?: string,
  ): Promise<IAudioRoomDocument> {
    // client data validation
    let audioRoom = await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }

    const userObj = await AudioRoomHelper.getInstance().prepareUserData(userId);

    // check if user is banned
    const isBanned = audioRoom.bannedUsers.some(
      (b) => b.user._id?.toString() === userId,
    );
    if (isBanned) {
      throw new AppError(403, "User is banned");
    }

    // check for room lock status and password matching
    if (audioRoom.isLocked) {
      if (!password) {
        throw new AppError(401, "Password required");
      }
      if (password !== audioRoom.password) {
        throw new AppError(401, "Incorrect password");
      }
    }

    const audioHelper = AudioRoomHelper.getInstance();
    // prepare user info
    const userInfo: IMemberDetails = audioHelper.generateMemberDetails(userObj);

    // remove text-bubble from join message
    if (
      userObj.equippedStoreItems &&
      userObj.equippedStoreItems["text-bubble"]
    ) {
      delete userObj.equippedStoreItems["text-bubble"];
    }

    // prepare join room message
    const joinMessage: IRoomMessage = audioHelper.generateRoomMessage(
      userObj,
      "joined the room",
    );

    await AudioRoomHelper.getInstance().handleRoomPresence(userId, roomId);

    const isHost = audioRoom.hostId.toString() === userId;
    const userAlreadyInRoom = audioRoom.members.has(userId);

    // handle if the user already in the room or if it's the host
    if (!userAlreadyInRoom || isHost) {
      const updateQuery: any = {
        $set: {
          [`members.${userId}`]: true,
          isHostPresent: isHost ? true : audioRoom.isHostPresent,
          isActive: true,
        },
      };

      if (isHost) {
        updateQuery.$set.hostSeat = {
          available: true,
          member: userInfo,
        };
      }

      if (!userAlreadyInRoom) {
        updateQuery.$push = {
          membersArray: userId,
          messages: {
            $each: [joinMessage],
            $slice: -ALLOWED_MESSAGES_COUNT,
          },
        };
      }

      audioRoom = await this.audioRoomRepository.findByIdAndUpdate(
        audioRoom._id as string,
        updateQuery,
      );
    }

    // emit join event to the room
    const socketInstance = SingletonSocketServer.getInstance();
    // make the user join the socket room
    socketInstance.joinRoomSocket(userId, roomId);
    socketInstance.emitToRoom(roomId, AudioRoomChannels.UserJoined, {
      user: userInfo,
      ...(isHost && { isHostPresent: true }),
    });

    if (isHost) {
      socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioSeatJoined, {
        seatKey: "hostSeat",
        userInfo,
      });
    }
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioRoomMessage, {
      message: joinMessage,
    });

    // parallel operations for tracking
    await Promise.all([
      this.recentVisitedRoomRepository.create({
        userId: userId,
        roomId: roomId,
      }),
      AudioRoomHelper.getInstance().addUniqueUserToRoomSupport(roomId, userId),
    ]);

    return await this.audioRoomRepository.getAudioRoomById(roomId);
  }

  async joinAudioSeat(
    userId: string,
    roomId: string,
    seatKey: string,
  ): Promise<IAudioRoomDocument> {
    // client side data validation
    const userObj = await AudioRoomHelper.getInstance().prepareUserData(userId);
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    if (!audioRoom.members.has(userId)) {
      throw new AppError(403, "User not in the room");
    }
    // seat validation
    // only host can sit in host seat
    if (seatKey == "hostSeat" && audioRoom.hostId != userId) {
      throw new AppError(403, "you are not authorized to sit in host seat");
    }
    // for other seats
    const seat = audioRoom.seats.get(seatKey);
    if (!seat && seatKey !== "hostSeat") {
      throw new AppError(404, "Seat not found");
    }
    if (seat && (!seat.available || seat.member)) {
      throw new AppError(403, "Seat is not available");
    }
    // check if the user is seated on any other seat
    const isUserAlreadySeated =
      audioRoom.hostSeat.member?._id?.toString() === userId ||
      Array.from(audioRoom.seats.values()).some(
        (seat) => seat.member?._id?.toString() === userId,
      );

    if (isUserAlreadySeated) {
      throw new AppError(403, "User is already seated");
    }

    // prepare socket data -> userInfo
    const userInfo: IMemberDetails =
      AudioRoomHelper.getInstance().generateMemberDetails(userObj);

    // socket emit to the whole room
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioSeatJoined, {
      seatKey,
      userInfo,
    });
    // account for host seat
    // user seated

    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $set: {
        [`${seatKey == "hostSeat" ? seatKey : `seats.${seatKey}`}`]: {
          available: true,
          member: userInfo,
        },
      },
    });

    const finalRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    if (finalRoom) this.emitRoomData(finalRoom);
    return finalRoom;
  }

  async leaveAudioSeat(
    userId: string,
    roomId: string,
    seatKey: string,
  ): Promise<IAudioRoomDocument> {
    // client side data validation
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    if (!audioRoom.members.has(userId)) {
      throw new AppError(403, "User not in the room");
    }

    // seatKey validation
    const seat = audioRoom.seats.get(seatKey);
    if (!seat && seatKey !== "hostSeat") {
      throw new AppError(404, "Seat not found");
    }
    // check if the user is seated
    const isUserAlreadySeated =
      audioRoom.hostSeat.member?._id?.toString() === userId ||
      Array.from(audioRoom.seats.values()).some(
        (seat) => seat.member?._id?.toString() === userId,
      );
    if (!isUserAlreadySeated) {
      throw new AppError(403, "User not seated");
    }
    if (
      (seatKey == "hostSeat" &&
        audioRoom.hostSeat.member?._id?.toString() != userId) ||
      (seat && seat.member?._id?.toString() != userId)
    ) {
      throw new AppError(403, `you are not seated in ${seatKey}`);
    }

    // update the audio room
    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $set: {
        [`${seatKey == "hostSeat" ? seatKey : `seats.${seatKey}`}`]: {
          available: true,
          member: null,
        },
      },
    });

    // send leave event to the room
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioSeatLeft, {
      seatKey,
      member: {},
    });
    const finalRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    if (finalRoom) this.emitRoomData(finalRoom);
    return finalRoom;
  }

  async makeAudioAdmin(
    myId: string,
    targetId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument> {
    // host cant be admin
    if (myId == targetId) {
      throw new AppError(403, "You are the host");
    }
    // client side data validation
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    const user = await this.userRepository.findUserById(myId);
    const targetUser = await this.userRepository.findUserById(targetId);
    if (!user || !targetUser) {
      throw new AppError(404, "User not found");
    }
    // check authority validation for host or admin
    const audioHelper = AudioRoomHelper.getInstance();
    audioHelper.checkAuthorityInAudioRoom(myId, audioRoom, 0); // 0 -> host level authority (only host can make admins)
    audioHelper.checkUserOnSeat(targetId, audioRoom); // user must be on a seat to be made admin
    // update audio room admins
    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $addToSet: {
        admins: targetId,
      },
    });
    // send event to the room
    const socketInstance = SingletonSocketServer.getInstance();
    const updatedAudioRoom =
      await this.audioRoomRepository.getAudioRoomById(roomId);
    socketInstance.emitToRoom(roomId, AudioRoomChannels.BasicRoomUpdate, {
      admins: updatedAudioRoom?.admins,
    });
    if (updatedAudioRoom) this.emitRoomData(updatedAudioRoom);
    return updatedAudioRoom;
  }

  async removeAudioAdmin(
    myId: string,
    targetId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument> {
    // client side data validation
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    const user = await this.userRepository.findUserById(myId);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    // check authority validation for host only
    const audioHelper = AudioRoomHelper.getInstance();
    audioHelper.checkAuthorityInAudioRoom(myId, audioRoom, 0); // 0 -> host level authorrity
    if (!audioRoom.admins.includes(targetId)) {
      throw new AppError(404, "User is not an admin");
    }
    // update audio room admins
    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $pull: {
        admins: targetId,
      },
    });
    // send event to the room
    const socketInstance = SingletonSocketServer.getInstance();
    const updatedAudioRoom =
      await this.audioRoomRepository.getAudioRoomById(roomId);
    socketInstance.emitToRoom(roomId, AudioRoomChannels.BasicRoomUpdate, {
      admins: updatedAudioRoom?.admins,
    });
    if (updatedAudioRoom) this.emitRoomData(updatedAudioRoom);
    return updatedAudioRoom;
  }

  async removeFromSeat(
    myId: string,
    targetId: string,
    roomId: string,
    seatKey: string,
  ): Promise<IAudioRoomDocument> {
    console.log(myId, targetId, roomId, seatKey);

    // admin cant be removed from the seat
    if (seatKey == "hostSeat") {
      throw new AppError(403, "cannot remove from host seat");
    }
    // client side data validation
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    const user = await this.userRepository.findUserById(myId);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    // check authority validation for host only
    const audioHelper = AudioRoomHelper.getInstance();
    audioHelper.checkAuthorityInAudioRoom(myId, audioRoom, 1, targetId); // 0 -> host level authority
    if (!audioRoom.seats.has(seatKey)) {
      throw new AppError(404, "Seat not found");
    }
    const seat = audioRoom.seats.get(seatKey);
    if (!seat) {
      throw new AppError(404, "Seat not found");
    }

    if (seat.member?._id?.toString() !== targetId) {
      throw new AppError(404, "User is not on this seat");
    }

    // update audio room seats
    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $set: {
        [`seats.${seatKey}`]: {
          available: true,
          member: null,
        },
      },
    });

    // send event to the room
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioSeatLeft, {
      seatKey: seatKey,
      member: {},
    });
    const finalRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    if (finalRoom) this.emitRoomData(finalRoom);
    return finalRoom;
  }

  async muteUnmuteSeat(
    myId: string,
    roomId: string,
    seatKey: string,
  ): Promise<IAudioRoomDocument> {
    const audioRoom = await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }

    // check authority validation for host only
    const audioHelper = AudioRoomHelper.getInstance();
    audioHelper.checkAuthorityInAudioRoom(myId, audioRoom, 0); // 0 -> host level authority

    let isMuteCurrent = false;
    if (seatKey === "hostSeat") {
      isMuteCurrent = audioRoom.hostSeat?.isMute || false;
    } else {
      const seat = audioRoom.seats.get(seatKey);
      if (!seat) {
        throw new AppError(404, "Seat not found");
      }
      isMuteCurrent = seat.isMute || false;
    }

    const newMuteStatus = !isMuteCurrent;
    const updatePath = seatKey === "hostSeat" ? "hostSeat.isMute" : `seats.${seatKey}.isMute`;

    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $set: {
        [updatePath]: newMuteStatus,
      },
    });

    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    if (!updatedRoom) {
      throw new AppError(404, "Updated audio room not found");
    }

    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.BasicRoomUpdate, {
      seats: updatedRoom.seats,
    });

    this.emitRoomData(updatedRoom);
    return updatedRoom;
  }

  async muteUnmuteUser(
    myId: string,
    targetId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument> {
    // check if the target Id is immune to this action
    const privilegeService = PrivilegeService.getInstance();
    const canUserBeMuted = await privilegeService.canUserBeMuted(targetId);
    if (!canUserBeMuted) {
      throw new AppError(403, "User is immune to this action");
    }
    //client side data validation
    let audioRoom = await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    const user = await this.userRepository.findUserById(myId);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    // check authority validation for host only
    const audioHelper = AudioRoomHelper.getInstance();
    audioHelper.checkAuthorityInAudioRoom(myId, audioRoom, 1, targetId); // 0 -> host level authority
    audioHelper.checkUserOnSeat(targetId, audioRoom);

    if (!audioRoom.mutedUsers.has(targetId)) {
      audioRoom = await this.audioRoomRepository.findByIdAndUpdate(
        audioRoom._id as string,
        {
          $set: {
            [`mutedUsers.${targetId}`]: true,
          },
        },
      );
    } else {
      audioRoom = await this.audioRoomRepository.findByIdAndUpdate(
        audioRoom._id as string,
        {
          $unset: {
            [`mutedUsers.${targetId}`]: "",
          },
        },
      );
    }

    // send event to the room
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.muteUnmuteUser, {
      mutedUsers: Object.fromEntries(audioRoom.mutedUsers),
    });
    const finalRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    if (finalRoom) this.emitRoomData(finalRoom);
    return finalRoom;
  }

  async leaveAudioRoom(
    userId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument> {
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    const socketInstance = SingletonSocketServer.getInstance();
    const updatedRoom = await socketInstance.handleAudioRoomDisconnection(
      userId,
      audioRoom,
    );
    if (updatedRoom) this.emitRoomData(updatedRoom);
    return updatedRoom;
  }

  async sendRoomWideMessage(
    myId: string,
    roomId: string,
    message: string,
  ): Promise<IAudioRoomDocument> {
    // client side data validation
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    if (!audioRoom.members.has(myId)) {
      throw new AppError(403, "You are not a member of this audio room");
    }
    if (audioRoom.chatPrivacy == "none") {
      throw new AppError(403, "Chat is disabled");
    }
    if (
      audioRoom.chatPrivacy == "custom" &&
      audioRoom.allowedUsersToChat &&
      !audioRoom.allowedUsersToChat.has(myId)
    ) {
      throw new AppError(403, "You are not allowed to chat");
    }

    if (
      audioRoom.bannedFromMessages &&
      audioRoom.bannedFromMessages.some((id) => id.toString() === myId)
    ) {
      throw new AppError(
        403,
        "You are banned from sending messages in this room",
      );
    }

    const userObj = await AudioRoomHelper.getInstance().prepareUserData(myId);
    const messageBody: IRoomMessage =
      AudioRoomHelper.getInstance().generateRoomMessage(userObj, message);
    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $push: {
        messages: {
          $each: [messageBody],
          $slice: -ALLOWED_MESSAGES_COUNT,
        },
      },
    });
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioRoomMessage, {
      message: messageBody,
    });
    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    return updatedRoom;
  }

  async clearChat(myId: string, roomId: string): Promise<IAudioRoomDocument> {
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    const helperInstance = AudioRoomHelper.getInstance();
    helperInstance.checkAuthorityInAudioRoom(myId, audioRoom, 1);
    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $set: {
        messages: [],
      },
    });
    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioRoomDetails, {
      audioRoom: updatedRoom,
    });
    return updatedRoom;
  }

  async getMyAudioRoom(myId: string): Promise<IAudioRoomDocument> {
    const user = await this.userRepository.findUserById(myId);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    const audioRoom = await this.audioRoomRepository.getAudioRoomByHostId(
      user._id as string,
    );

    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    return await this.audioRoomRepository.getAudioRoomById(audioRoom);
  }

  async searchAudioRoom(userId: number): Promise<IAudioRoomDocument> {
    const targetUser = await this.userRepository.findUserByShortId(userId);
    if (!targetUser) {
      throw new AppError(404, "User not found");
    }
    const audioRoomId = await this.audioRoomRepository.getAudioRoomByHostId(
      targetUser._id as string,
    );
    if (!audioRoomId) {
      throw new AppError(404, "Audio room not found");
    }
    return await this.audioRoomRepository.getAudioRoomById(audioRoomId);
  }

  async getRocketInfo(roomId: string): Promise<IRocketServiceResponse> {
    return await RocketService.getInstance().getRocketInfo(roomId);
  }

  async updateRoomTitle(
    myId: string,
    roomId: string,
    title: string,
  ): Promise<IAudioRoomDocument> {
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    const helperInstance = AudioRoomHelper.getInstance();
    helperInstance.checkAuthorityInAudioRoom(myId, audioRoom, 1);
    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $set: {
        title: title,
      },
    });
    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.BasicRoomUpdate, {
      title: updatedRoom?.title,
    });
    if (updatedRoom) this.emitRoomData(updatedRoom);
    return updatedRoom;
  }

  async updateRoomAnnouncement(
    myId: string,
    roomId: string,
    announcement: string,
  ): Promise<IAudioRoomDocument> {
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    const helperInstance = AudioRoomHelper.getInstance();
    helperInstance.checkAuthorityInAudioRoom(myId, audioRoom, 1);
    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $set: {
        announcement: announcement,
      },
    });
    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.BasicRoomUpdate, {
      announcement: updatedRoom?.announcement,
    });
    if (updatedRoom) this.emitRoomData(updatedRoom);
    return updatedRoom;
  }

  async lockUnlockSeat(
    myId: string,
    roomId: string,
    seatKey: string,
  ): Promise<IAudioRoomDocument> {
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) throw new AppError(404, "Audio Room Not Found");

    // only host or admin can lock/unlock seats
    const audioHelper = AudioRoomHelper.getInstance();
    audioHelper.checkAuthorityInAudioRoom(myId, audioRoom, 1);

    // host seat cannot be locked
    if (seatKey === "hostSeat") {
      throw new AppError(403, "Cannot lock/unlock the host seat");
    }

    const seat = audioRoom.seats.get(seatKey);
    if (!seat) {
      throw new AppError(404, "Seat not found");
    }

    // toggle: if currently available -> lock it (available: false), if locked -> unlock it (available: true)
    const newAvailability = !seat.available;

    // if locking a seat that has a member, remove the member first
    const updateQuery: any = {
      $set: {
        [`seats.${seatKey}.available`]: newAvailability,
      },
    };
    if (!newAvailability && seat.member) {
      updateQuery.$set[`seats.${seatKey}.member`] = null;
      // notify the room that the user left the seat
      const socketInstance = SingletonSocketServer.getInstance();
      socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioSeatLeft, {
        seatKey,
        member: {},
      });
    }

    await this.audioRoomRepository.findByIdAndUpdate(
      audioRoom._id as string,
      updateQuery,
    );

    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.BasicRoomUpdate, {
      seats: updatedRoom?.seats,
    });
    if (updatedRoom) this.emitRoomData(updatedRoom);
    return updatedRoom;
  }

  async lockAllSeats(
    myId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument> {
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) throw new AppError(404, "Audio Room Not Found");

    const audioHelper = AudioRoomHelper.getInstance();
    audioHelper.checkAuthorityInAudioRoom(myId, audioRoom, 1);

    const updateQuery: any = { $set: {} };
    const socketInstance = SingletonSocketServer.getInstance();

    for (const [key, seat] of audioRoom.seats.entries()) {
      // Only lock if the seat is empty
      if (!seat.member) {
        updateQuery.$set[`seats.${key}.available`] = false;
      }
    }

    await this.audioRoomRepository.findByIdAndUpdate(
      audioRoom._id as string,
      updateQuery,
    );

    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    socketInstance.emitToRoom(roomId, AudioRoomChannels.BasicRoomUpdate, {
      seats: updatedRoom?.seats,
    });
    if (updatedRoom) this.emitRoomData(updatedRoom);
    return updatedRoom;
  }

  async unlockAllSeats(
    myId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument> {
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) throw new AppError(404, "Audio Room Not Found");

    const audioHelper = AudioRoomHelper.getInstance();
    audioHelper.checkAuthorityInAudioRoom(myId, audioRoom, 1);

    const updateQuery: any = { $set: {} };

    for (const key of audioRoom.seats.keys()) {
      updateQuery.$set[`seats.${key}.available`] = true;
    }

    await this.audioRoomRepository.findByIdAndUpdate(
      audioRoom._id as string,
      updateQuery,
    );

    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.BasicRoomUpdate, {
      seats: updatedRoom?.seats,
    });
    if (updatedRoom) this.emitRoomData(updatedRoom);
    return updatedRoom;
  }

  async updateRoomPhoto(
    myId: string,
    roomId: string,
    roomPhoto: string,
  ): Promise<IAudioRoomDocument> {
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) throw new AppError(404, "Audio Room Not Found");

    const helperInstance = AudioRoomHelper.getInstance();
    helperInstance.checkAuthorityInAudioRoom(myId, audioRoom, 1);

    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $set: {
        roomPhoto: roomPhoto,
      },
    });

    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.BasicRoomUpdate, {
      roomPhoto: updatedRoom?.roomPhoto,
    });
    if (updatedRoom) this.emitRoomData(updatedRoom);
    return updatedRoom;
  }

  async banUser(
    myId: string,
    targetId: string,
    roomId: string,
    banType: ActivityZoneState,
    bannedTill?: string,
  ): Promise<IAudioRoomDocument> {
    // check if the target Id is immune to this action
    const privilegeService = PrivilegeService.getInstance();
    const canUserBeKicked = await privilegeService.canUserBeKicked(targetId);
    if (!canUserBeKicked) {
      throw new AppError(403, "User is immune to this action");
    }
    // can't ban yourself
    if (myId === targetId) {
      throw new AppError(403, "You cannot ban yourself");
    }
    // validate room
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    // authority check (host or admin)
    const audioHelper = AudioRoomHelper.getInstance();
    audioHelper.checkAuthorityInAudioRoom(myId, audioRoom, 1, targetId);

    // validate target user
    const targetUser = await this.userRepository.findUserById(targetId);
    if (!targetUser) {
      throw new AppError(404, "User not found");
    }

    // validate banType
    if (!Object.values(ActivityZoneState).includes(banType)) {
      throw new AppError(400, "Invalid ban type");
    }
    if (banType === ActivityZoneState.temporaryBlock && !bannedTill) {
      throw new AppError(400, "bannedTill is required for temporary ban");
    }

    // check if bannedTill is a valid date
    if (banType === ActivityZoneState.temporaryBlock && bannedTill) {
      const bannedTillDate = new Date(bannedTill);
      if (isNaN(bannedTillDate.getTime())) {
        throw new AppError(400, "Invalid date format for bannedTill");
      }
      if (bannedTillDate < new Date()) {
        throw new AppError(400, "bannedTill cannot be in the past");
      }
    }

    // build member details for the banned user entry
    const targetUserObj = await audioHelper.prepareUserData(targetId);
    const memberDetails: IMemberDetails =
      audioHelper.generateMemberDetails(targetUserObj);

    // check if already banned → update, otherwise push
    const existingBan = audioRoom.bannedUsers.find(
      (b) => b.user._id?.toString() === targetId,
    );
    if (existingBan) {
      // update existing ban entry
      await this.audioRoomRepository.findByIdAndUpdate(
        audioRoom._id as string,
        {
          $set: {
            "bannedUsers.$[elem].banType": banType,
            "bannedUsers.$[elem].bannedTill": bannedTill || "",
          },
        },
        {
          arrayFilters: [{ "elem.user._id": targetId }],
        },
      );
    } else {
      // push new ban entry
      await this.audioRoomRepository.findByIdAndUpdate(
        audioRoom._id as string,
        {
          $push: {
            bannedUsers: {
              user: memberDetails,
              banType,
              bannedTill: bannedTill || "",
            },
          },
        },
      );
    }

    // emit instance
    const socketInstance = SingletonSocketServer.getInstance();

    // remove target from seats
    const updateQuery: any = { $unset: {} };
    let seatRemoved = false;
    // check host seat
    if (audioRoom.hostSeat.member?._id?.toString() === targetId) {
      updateQuery.$set = { hostSeat: { available: true, member: null } };
      seatRemoved = true;
      socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioSeatLeft, {
        seatKey: "hostSeat",
        member: {},
      });
    }
    // check regular seats
    for (const [key, seat] of audioRoom.seats.entries()) {
      if (seat.member?._id?.toString() === targetId) {
        if (!updateQuery.$set) updateQuery.$set = {};
        updateQuery.$set[`seats.${key}`] = { available: true, member: null };
        socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioSeatLeft, {
          seatKey: `seats.${key}`,
          member: {},
        });
      }
    }

    // remove from members
    if (!updateQuery.$unset) updateQuery.$unset = {};
    updateQuery.$unset[`members.${targetId}`] = "";

    // also pull from membersArray
    if (!updateQuery.$pull) updateQuery.$pull = {};
    updateQuery.$pull["membersArray"] = targetId;

    // if the room becomes empty, mark as inactive
    const roomHasOtherMembers = audioRoom.membersArray.some(
      (m) => m.toString() !== targetId,
    );
    if (!roomHasOtherMembers) {
      if (!updateQuery.$set) updateQuery.$set = {};
      updateQuery.$set.isActive = false;
    }

    // clean up empty $unset / $set
    if (Object.keys(updateQuery.$unset).length === 0) delete updateQuery.$unset;
    if (updateQuery.$set && Object.keys(updateQuery.$set).length === 0) delete updateQuery.$set;

    await this.audioRoomRepository.findByIdAndUpdate(
      audioRoom._id as string,
      updateQuery,
    );

    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    socketInstance.emitToRoom(roomId, AudioRoomChannels.BasicRoomUpdate, {
      bannedUsers: updatedRoom.bannedUsers,
    });
    if (updatedRoom) this.emitRoomData(updatedRoom);
    return updatedRoom;
  }

  async unbanUser(
    myId: string,
    targetId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument> {
    // can't unban yourself
    if (myId === targetId) {
      throw new AppError(403, "You cannot unban yourself");
    }
    // validate room
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    // authority check (host or admin)
    const audioHelper = AudioRoomHelper.getInstance();
    audioHelper.checkAuthorityInAudioRoom(myId, audioRoom, 1, targetId);

    // check if target is actually banned
    const isBanned = audioRoom.bannedUsers.some(
      (b) => b.user._id?.toString() === targetId,
    );
    if (!isBanned) {
      throw new AppError(404, "User is not banned");
    }

    // remove from bannedUsers
    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $pull: {
        bannedUsers: { "user._id": targetId },
      },
    });

    // emit socket events
    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.BasicRoomUpdate, {
      bannedUsers: updatedRoom.bannedUsers,
    });
    if (updatedRoom) this.emitRoomData(updatedRoom);
    return updatedRoom;
  }

  async banFromChat(
    myId: string,
    targetId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument> {
    // check if the target Id is immune to this action
    const privilegeService = PrivilegeService.getInstance();
    const canUserBeBannedFromChat =
      await privilegeService.canUserBeBannedFromChat(targetId);
    if (!canUserBeBannedFromChat) {
      throw new AppError(403, "User is immune to this action");
    }
    // 1. Safety Guard: Prevent users from performing administrative actions on themselves.
    if (myId === targetId) {
      throw new AppError(403, "You cannot ban yourself");
    }

    // 2. Room Validation: Verify the room exists in the repository before continuing.
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }

    // 3. Permission Check: Ensure the requester has Admin (level 1) or Host (level 0) authority.
    const audioHelper = AudioRoomHelper.getInstance();
    audioHelper.checkAuthorityInAudioRoom(myId, audioRoom, 1, targetId);

    // 4. Target Integrity: Confirm the user being restricted actually exists in the system.
    const targetUser = await this.userRepository.findUserById(targetId);
    if (!targetUser) {
      throw new AppError(404, "User not found");
    }

    // 5. Context Validation: Restrictions are only meaningful if the target is currently in the room.
    if (!audioRoom.members.has(targetId)) {
      throw new AppError(400, "User is not a member of this room");
    }

    // 6. Idempotency Guard: Check if the user is already restricted to avoid redundant operations.
    if (
      audioRoom.bannedFromMessages &&
      audioRoom.bannedFromMessages.some((id) => id.toString() === targetId)
    ) {
      throw new AppError(400, "User is already banned from chat");
    }

    // 7. Persistence: Atomically add the user to the restricted messages list using $addToSet.
    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $addToSet: {
        bannedFromMessages: targetId,
      },
    });

    // 8. Real-time Synchronization: Fetch the updated state and broadcast changes via Socket.io.
    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.BasicRoomUpdate, {
      bannedFromMessages: updatedRoom.bannedFromMessages,
    });

    // 9. Full State Sync: Emit the serialized room data to keep all clients in sync.
    if (updatedRoom) this.emitRoomData(updatedRoom);
    return updatedRoom;
  }

  async unbanFromChat(
    myId: string,
    targetId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument> {
    if (myId === targetId) {
      throw new AppError(403, "You cannot unban yourself");
    }
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }

    const audioHelper = AudioRoomHelper.getInstance();
    audioHelper.checkAuthorityInAudioRoom(myId, audioRoom, 1, targetId);

    if (
      !audioRoom.bannedFromMessages ||
      !audioRoom.bannedFromMessages.some((id) => id.toString() === targetId)
    ) {
      throw new AppError(400, "User is not banned from chat");
    }

    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $pull: {
        bannedFromMessages: targetId,
      },
    });

    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.BasicRoomUpdate, {
      bannedFromMessages: updatedRoom.bannedFromMessages,
    });
    if (updatedRoom) this.emitRoomData(updatedRoom);
    return updatedRoom;
  }

  async updateRoomPassword({
    myId,
    roomId,
    password,
  }: {
    myId: string;
    roomId: string;
    password: string;
  }): Promise<IAudioRoomDocument> {
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    const helperInstance = AudioRoomHelper.getInstance();
    helperInstance.checkAuthorityInAudioRoom(myId, audioRoom, 1);

    // if password is empty string → unlock the room
    // if password has a value → lock the room with the password
    const isLocked = password !== "";

    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $set: {
        password: password,
        isLocked: isLocked,
      },
    });

    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioRoomDetails, {
      audioRoom: updatedRoom,
    });
    return updatedRoom;
  }

  async updateSeatCount(
    myId: string,
    roomId: string,
    seatCount: number,
  ): Promise<IAudioRoomDocument> {
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    const helperInstance = AudioRoomHelper.getInstance();
    helperInstance.checkAuthorityInAudioRoom(myId, audioRoom, 1);

    if (audioRoom.numberOfSeats === seatCount) {
      throw new AppError(400, "Seat count is already updated");
    }

    if (audioRoom.numberOfSeats > seatCount) {
      const socketInstance = SingletonSocketServer.getInstance();
      // we are reducing seats, check if anyone is sitting in the seats to be removed
      // e.g. 12 -> 8. seats 9, 10, 11, 12 need to be checked
      for (let i = seatCount + 1; i <= audioRoom.numberOfSeats; i++) {
        const seatKey = `seat-${i}`;
        const seat = audioRoom.seats.get(seatKey);
        if (seat && seat.member && seat.member._id) {
          // someone is sitting here, emit leave event
          console.log("emit leave event");
          socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioSeatLeft, {
            seatKey: seatKey,
            member: {},
          });
        }
      }
    }

    // update the seat count. The pre-save hook in the model will handle
    // adding/removing the actual seat entries in the map
    audioRoom.numberOfSeats = seatCount;
    await (audioRoom as any).save();

    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.BasicRoomUpdate, {
      seats: updatedRoom?.seats,
      numberOfSeats: updatedRoom?.numberOfSeats,
    });
    if (updatedRoom) this.emitRoomData(updatedRoom);
    return updatedRoom;
  }

  async setChatPrivacy(
    myId: string,
    roomId: string,
    chatPrivacy: "any" | "none" | string[],
  ): Promise<IAudioRoomDocument> {
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    const helperInstance = AudioRoomHelper.getInstance();
    helperInstance.checkAuthorityInAudioRoom(myId, audioRoom, 1);

    if (Array.isArray(chatPrivacy)) {
      // check if all users exist
      const allExist = await this.userRepository.validateUserIds(chatPrivacy);
      if (!allExist) {
        throw new AppError(404, "Some users not found");
      }
    }

    const allowedUsersToChat = Array.isArray(chatPrivacy)
      ? chatPrivacy.reduce(
        (acc, userId) => {
          acc[userId] = true;
          return acc;
        },
        {} as Record<string, boolean>,
      )
      : {};

    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $set: {
        chatPrivacy: Array.isArray(chatPrivacy) ? "custom" : chatPrivacy,
        allowedUsersToChat: allowedUsersToChat,
      },
    });

    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.BasicRoomUpdate, {
      chatPrivacy: updatedRoom?.chatPrivacy,
      allowedUsersToChat: updatedRoom?.allowedUsersToChat,
    });
    if (updatedRoom) this.emitRoomData(updatedRoom);
    return updatedRoom;
  }

  async getMyRecentVisitedRooms(myId: string): Promise<IAudioRoomDocument[]> {
    const recentVisits =
      await this.recentVisitedRoomRepository.getByUserId(myId);
    if (!recentVisits || recentVisits.length === 0) return [];

    const roomIds = recentVisits.map((v) => v.roomId);

    // Fetch all rooms in a SINGLE database round-trip
    const rooms = await this.audioRoomRepository.getRoomsByRoomIds(roomIds);

    // Map back to guarantee the original chronological order from recentVisits
    // and filter out any rooms that might have been deleted (not found in bulk fetch)
    return roomIds
      .map((id) => rooms.find((room) => room.roomId === id))
      .filter((room): room is IAudioRoomDocument => !!room);
  }

  async getRoomVisitors(roomId: string): Promise<IMemberDetails[]> {
    const room = await this.audioRoomRepository.getAudioRoomById(roomId);
    if (!room) throw new AppError(404, "Audio room not found");
    const helper = AudioRoomHelper.getInstance();
    return (room.membersArray as any[]).map((user) =>
      helper.generateMemberDetails(user),
    );
  }

  async getRoomMessages(roomId: string): Promise<IRoomMessage[]> {
    const room = await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!room) throw new AppError(404, "Audio room not found");
    return room.messages;
  }

  async getInsideRoomRanking(
    myId: string,
    roomId: string,
    period: RankingPeriods,
  ): Promise<any> {
    const [ranking, myContribution, totalRoomTransaction] = await Promise.all([
      RepositoryProviders.giftRecordRepositoryProvider.getInsideRoomRanking(
        roomId,
        period,
      ),
      RepositoryProviders.giftRecordRepositoryProvider.getMyRoomContribution(
        myId,
        roomId,
        period,
      ),
      RepositoryProviders.giftRecordRepositoryProvider.getTotalRoomTransaction(
        roomId,
      ),
    ]);

    const myIndex = ranking.findIndex(
      (r) => r.memberDetails!._id.toString() === myId,
    );

    const myRanking = {
      amount: myContribution.amount,
      memberDetails: myContribution.memberDetails,
      rank:
        myIndex !== -1
          ? myIndex + 1
          : ranking.length >= 100
            ? "100+"
            : ranking.length + 1,
    };

    return {
      ranking: ranking,
      totalRoomTransaction: totalRoomTransaction,
      myRanking: myRanking,
    };
  }

  async getRewardedUsers(roomId: string): Promise<IRewarededUser[]> {
    return (await RocketService.getInstance().getRewardedUsers(roomId)) || [];
  }

  private emitRoomData(room: IAudioRoomDocument) {
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(
      room.roomId,
      AudioRoomChannels.RoomData,
      socketInstance.roomDataSerializer(room),
    );
  }
}
