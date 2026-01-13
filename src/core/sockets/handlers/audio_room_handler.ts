import { Socket, Server } from "socket.io";
import {
  RoomTypes,
  SocketAudioChannels,
  SocketChannels,
} from "../../Utils/enums";
import { IUserRepository } from "../../../repository/users/user_repository";
import { IMyBucketRepository } from "../../../repository/store/my_bucket_repository";
import { IStoreCategoryRepository } from "../../../repository/store/store_category_repository";
import {
  getEquipedItemObjects,
  isEmptyObject,
  socketResponse,
  updateUserXpFunc,
} from "../../Utils/helper_functions";
import {
  IAudioRoomData,
  IAudioSeats,
  ILaunchRocketInfo,
  IMemberDetails,
  IRoomMessage,
  IRoomXPData,
  ISearializedAudioRoom,
} from "../interface/socket_interface";
import { AudioRoomPolicy } from "../policies/audio_room_policy";
import SocketServer from "../socket_server";
import { IGiftAudioRocket } from "../../../models/gifts/gift_audio_rocket_model";
import AdminRepository from "../../../repository/admin/admin_repository";
import { IBlockedEmailRepository } from "../../../repository/security/blockedEmailRepository";
import { ROCKET_MILESTONES, ROOM_ENTRY_XP } from "../../Utils/constants";

export const registerAudioRoomHandler = async (
  io: Server,
  socket: Socket,
  onlineUsers: Map<string, string>,
  audioRoom: Record<string, IAudioRoomData>,
  userRepository: IUserRepository,
  adminRepository: AdminRepository,
  bucketRepository: IMyBucketRepository,
  categoryRepository: IStoreCategoryRepository,
  blockedEmailRepository: IBlockedEmailRepository,
  audioRoomVisitedHistory: Record<string, Record<string, string>>,
  roomXpTrackingSystem: Record<string, IRoomXPData>
) => {
  // userId -> mongoose object_id
  const userId = socket.handshake.query.userId as string;
  if (!userId) {
    socketResponse(io, SocketChannels.error, socket.id, {
      success: false,
      message: "User ID is required",
    });
    return;
  }

  // get all audio hosts
  socket.on(SocketAudioChannels.GetAudioHosts, () => {
    let hosts = [];
    for (const [room, roomData] of Object.entries(audioRoom)) {
      hosts.push(roomData.hostDetails);
    }
    socketResponse(io, SocketAudioChannels.GetAudioHosts, socket.id, {
      success: true,
      message: "Successfully fetched all audio hosts",
      data: hosts,
    });
  });

  // fetching the relavent informations
  const userDetails = await userRepository.getUserDetailsSelectedField(userId, [
    "name",
    "avatar",
    "uid",
    "userId",
    "country",
    "currentLevelBackground",
    "currentLevelTag",
    "level",
    "activityZone",
  ]);

  if (!userDetails) {
    socketResponse(io, SocketChannels.error, socket.id, {
      success: false,
      message: "User does not exist",
    });
    return;
  }

  // attaching the equiped items from the store.
  const userObj = userDetails.toObject();
  userObj.equipedStoreItems = await getEquipedItemObjects(
    bucketRepository,
    categoryRepository,
    userId
  );

  // creating policy object
  const audioRoomPolicy = new AudioRoomPolicy(audioRoom, io, socket);
  // channel to create audio room
  socket.on(
    SocketAudioChannels.CreateAudioRoom,
    ({ roomId, title, numberOfSeats, announcement }) => {
      // validating input data
      const ensureUserIsNotBlocked =
        audioRoomPolicy.ensureUserIsNotBlocked(userDetails);
      const ensureCreateRoom = audioRoomPolicy.ensureCreateRoomPolicy(
        roomId,
        title,
        numberOfSeats
      );
      if (ensureUserIsNotBlocked == false) return;
      if (ensureCreateRoom == false) return;

      const membersDetails: IMemberDetails = {
        name: userDetails.name as string,
        avatar: userDetails.avatar as string,
        uid: userDetails.uid as string,
        userId: userDetails.userId as number,
        country: userDetails.country as string,
        _id: userDetails._id as string,
        currentBackground: userDetails.currentLevelBackground as string,
        currentTag: userDetails.currentLevelTag as string,
        currentLevel: userDetails.level as number,
        equipedStoreItems: userObj.equipedStoreItems,
        totalGiftSent: 0,
        isMuted: false,
      };

      let seats: Record<`seat-${number}`, IAudioSeats> = {};
      for (let i = 1; i <= numberOfSeats; i++) {
        seats[`seat-${i}`] = {
          member: {},
          available: true,
        };
      }
      const createdRoom: IAudioRoomData = {
        hostDetails: membersDetails,
        adminDetails: [],
        title: title,
        numberOfSeats: numberOfSeats,
        announcement: announcement ?? "",
        roomId: roomId,
        currentRocketFuel: 0,
        currentRocketLevel: 1,
        currentRocketMilestone: ROCKET_MILESTONES[0],
        roomTotalTransaction: 0,
        hostGifts: 0,
        hostBonus: 0,
        premiumSeat: {
          member: {},
          available: true,
        },
        seats,
        messages: [],
        createdAt: new Date(),
        members: new Set([userId]),
        membersDetails: [],
        bannedUsers: new Set(),
        mutedUsers: new Set(),
        ranking: [membersDetails],
        chatPrivacy: "any",
        isLocked: false,
        hostId: userId,
        isHostPresent: true,
      };
      audioRoom[roomId] = createdRoom;

      socket.join(roomId);
      // keeping track of audio room joinings
      if (!audioRoomVisitedHistory[userId])
        audioRoomVisitedHistory[userId] = {};
      audioRoomVisitedHistory[userId][roomId] = new Date().toISOString();

      // xp tracking
      if (process.env.XP_MODE == "1") {
        if (!roomXpTrackingSystem[userId]) {
          roomXpTrackingSystem[userId] = {
            firstEntry: false,
            ownRoomXP: 0,
            othersRoomXp: 0,
          };
        }

        if (roomXpTrackingSystem[userId].firstEntry == false) {
          roomXpTrackingSystem[userId].firstEntry = true;
          updateUserXpFunc(userRepository, userId, ROOM_ENTRY_XP, io);
        }
      }
      // sending all rooms list update
      const serializedRoom: ISearializedAudioRoom = {
        title: createdRoom.title,
        numberOfSeats: createdRoom.numberOfSeats,
        announcement: createdRoom.announcement,
        roomId: createdRoom.roomId,
        currentRocketFuel: createdRoom.currentRocketFuel,
        currentRocketLevel: createdRoom.currentRocketLevel,
        currentRocketMilestone: createdRoom.currentRocketMilestone,
        roomTotalTransaction: createdRoom.roomTotalTransaction,
        rocketFuelPercentage:
          createdRoom.currentRocketFuel / createdRoom.currentRocketMilestone,

        hostGifts: createdRoom.hostGifts,
        hostBonus: createdRoom.hostBonus,
        hostDetails: createdRoom.hostDetails,
        adminDetails: createdRoom.adminDetails,
        premiumSeat: createdRoom.premiumSeat,
        seats: createdRoom.seats,
        messages: createdRoom.messages,
        createdAt: createdRoom.createdAt,
        members: Array.from(createdRoom.members),
        membersDetails: createdRoom.membersDetails,
        bannedUsers: Array.from(createdRoom.bannedUsers),
        mutedUsers: Array.from(createdRoom.mutedUsers),
        ranking: createdRoom.ranking,
        chatPrivacy: createdRoom.chatPrivacy,
        duration: Math.floor(
          (new Date().getTime() - createdRoom.createdAt.getTime()) / 1000
        ),
        isHostPresent: createdRoom.isHostPresent,
        isLocked: createdRoom.isLocked,
      };

      const allRoomSerialized: ISearializedAudioRoom[] = [];

      for (const [room, roomData] of Object.entries(audioRoom)) {
        if (roomData.members.size == 0) continue;
        const obj: ISearializedAudioRoom = {
          title: roomData.title,
          numberOfSeats: roomData.numberOfSeats,
          announcement: roomData.announcement,
          roomId: roomData.roomId,
          currentRocketFuel: roomData.currentRocketFuel,
          currentRocketLevel: roomData.currentRocketLevel,
          currentRocketMilestone: roomData.currentRocketMilestone,
          roomTotalTransaction: roomData.roomTotalTransaction,
          rocketFuelPercentage:
            roomData.currentRocketFuel / roomData.currentRocketMilestone,
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
            (new Date().getTime() - roomData.createdAt.getTime()) / 1000
          ),
          isHostPresent: roomData.isHostPresent,
          isLocked: roomData.isLocked,
        };
        allRoomSerialized.push(obj);
      }

      socketResponse(io, SocketAudioChannels.CreateAudioRoom, socket.id, {
        success: true,
        message: "Successfully room created",
        data: serializedRoom,
      });

      io.emit(SocketAudioChannels.GetAllAudioRooms, {
        success: true,
        message: "Successfully room created",
        data: allRoomSerialized,
      });
    }
  );

  // get all audio rooms
  socket.on(SocketAudioChannels.GetAllAudioRooms, () => {
    const serializedRooms: ISearializedAudioRoom[] = [];
    for (const [room, roomData] of Object.entries(audioRoom)) {
      if (roomData.members.size == 0) continue;
      const obj: ISearializedAudioRoom = {
        title: roomData.title,
        numberOfSeats: roomData.numberOfSeats,
        announcement: roomData.announcement,
        roomId: roomData.roomId,
        currentRocketFuel: roomData.currentRocketFuel,
        currentRocketLevel: roomData.currentRocketLevel,
        currentRocketMilestone: roomData.currentRocketMilestone,
        roomTotalTransaction: roomData.roomTotalTransaction,
        rocketFuelPercentage:
          roomData.currentRocketFuel / roomData.currentRocketMilestone,
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
          (new Date().getTime() - roomData.createdAt.getTime()) / 1000
        ),
        isHostPresent: roomData.isHostPresent,
        isLocked: roomData.isLocked,
      };

      serializedRooms.push(obj);
    }

    socketResponse(io, SocketAudioChannels.GetAllAudioRooms, socket.id, {
      success: true,
      message: "Successfully fetched all audio rooms",
      data: serializedRooms,
    });
  });

  // get audio room details
  socket.on(SocketAudioChannels.RoomDetails, ({ roomId }) => {
    const ensureRoomExists = audioRoomPolicy.ensureRoomExists(roomId);
    if (ensureRoomExists == false) return;
    const room = audioRoom[roomId];
    const serializedRoom: ISearializedAudioRoom = {
      title: room.title,
      numberOfSeats: room.numberOfSeats,
      announcement: room.announcement,
      roomId: room.roomId,
      currentRocketFuel: room.currentRocketFuel,
      currentRocketLevel: room.currentRocketLevel,
      currentRocketMilestone: room.currentRocketMilestone,
      roomTotalTransaction: room.roomTotalTransaction,
      rocketFuelPercentage:
        room.currentRocketFuel / room.currentRocketMilestone,
      hostGifts: room.hostGifts,
      hostBonus: room.hostBonus,
      hostDetails: room.hostDetails,
      adminDetails: room.adminDetails,
      premiumSeat: room.premiumSeat,
      seats: room.seats,
      messages: room.messages,
      createdAt: room.createdAt,
      bannedUsers: Array.from(room.bannedUsers),
      members: Array.from(room.members),
      membersDetails: room.membersDetails,
      mutedUsers: Array.from(room.mutedUsers),
      ranking: room.ranking,
      chatPrivacy: room.chatPrivacy,
      duration: Math.floor(
        (new Date().getTime() - room.createdAt.getTime()) / 1000
      ),
      isHostPresent: room.isHostPresent,
      isLocked: room.isLocked,
    };
    socketResponse(io, SocketAudioChannels.RoomDetails, socket.id, {
      success: true,
      message: "Successfully fetched room details",
      data: serializedRoom,
    });
  });

  // user join audio room
  socket.on(SocketAudioChannels.JoinAudioRoom, async ({ roomId, password }) => {
    const ensureUserCanJoin = audioRoomPolicy.ensureUserCanJoin(
      roomId,
      userId,
      password
    );
    if (ensureUserCanJoin == false) return;
    const room = audioRoom[roomId];
    const alreadyUserInRoom = room.members.has(userId);
    const isHost = room.hostId === userId;

    const membersDetails: IMemberDetails = {
      name: userDetails.name as string,
      avatar: userDetails.avatar as string,
      uid: userDetails.uid as string,
      userId: userDetails.userId as number,
      country: userDetails.country as string,
      _id: userDetails._id as string,
      currentBackground: userDetails.currentLevelBackground as string,
      currentTag: userDetails.currentLevelTag as string,
      currentLevel: userDetails.level as number,
      equipedStoreItems: userObj.equipedStoreItems,
      totalGiftSent: 0,
      isMuted: false,
    };
    if (!alreadyUserInRoom) {
      room.members.add(userId);
      if (isHost) room.isHostPresent = true;
      if (!isHost) room.membersDetails.push(membersDetails);
      if (!isHost) room.ranking.push(membersDetails);
    }
    socket.join(roomId);
    // to keep track of recent joinings in audio rooms
    if (!audioRoomVisitedHistory[userId]) audioRoomVisitedHistory[userId] = {};
    audioRoomVisitedHistory[userId][roomId] = new Date().toISOString();

    // xp tracking
    if (process.env.XP_MODE == "1") {
      if (!roomXpTrackingSystem[userId]) {
        roomXpTrackingSystem[userId] = {
          firstEntry: false,
          ownRoomXP: 0,
          othersRoomXp: 0,
        };
      }

      if (roomXpTrackingSystem[userId].firstEntry == false) {
        roomXpTrackingSystem[userId].firstEntry = true;
        updateUserXpFunc(userRepository, userId, ROOM_ENTRY_XP, io);
      }
    }
    const message: IRoomMessage = {
      name: userDetails.name as string,
      avatar: userDetails.avatar as string,
      uid: userDetails.uid as string,
      userId: userDetails.userId as number,
      country: userDetails.country as string,
      _id: userDetails._id as string,
      text: "joined the room",
      currentBackground: userDetails.currentLevelBackground as string,
      currentTag: userDetails.currentLevelTag as string,
      currentLevel: userDetails.level as number,
      equipedStoreItems: userObj.equipedStoreItems,
    };
    if (room.messages.length >= 100) room.messages.shift();
    room.messages.push(message);
    socketResponse(io, SocketAudioChannels.SendMessage, roomId, {
      success: true,
      message: "Successfully joined the room",
      data: message,
    });
    // const serializedRoom: ISearializedAudioRoom = {
    //   title: room.title,
    //   numberOfSeats: room.numberOfSeats,
    //   roomId: room.roomId,
    //   hostGifts: room.hostGifts,
    //   hostBonus: room.hostBonus,
    //   hostDetails: room.hostDetails,
    //   premiumSeat: room.premiumSeat,
    //   seats: room.seats,
    //   messages: room.messages,
    //   createdAt: room.createdAt,
    //   members: Array.from(room.members),
    //   membersDetails: room.membersDetails,
    //   bannedUsers: Array.from(room.bannedUsers),
    //   mutedUsers: Array.from(room.mutedUsers),
    //   ranking: room.ranking,
    //   duration: Math.floor(
    //     (new Date().getTime() - room.createdAt.getTime()) / 1000
    //   ),
    // };

    const userDetailsToSend: IMemberDetails = {
      name: userDetails.name as string,
      avatar: userDetails.avatar as string,
      uid: userDetails.uid as string,
      userId: userDetails.userId as number,
      country: userDetails.country as string,
      _id: userDetails._id as string,
      currentBackground: userDetails.currentLevelBackground as string,
      currentTag: userDetails.currentLevelTag as string,
      currentLevel: userDetails.level as number,
      equipedStoreItems: userObj.equipedStoreItems,
      totalGiftSent: 0,
      isMuted: false,
    };

    socketResponse(
      io,
      isHost
        ? SocketAudioChannels.JoinHostBack
        : SocketAudioChannels.JoinAudioRoom,
      roomId,
      {
        success: true,
        message: "Successfully joined the room",
        data: userDetailsToSend,
      }
    );

    const isBlocked = await blockedEmailRepository.checkBlockedEmail(userId);
    if (isBlocked) {
      const socketInstance = SocketServer.getInstance();
      socketInstance.handleAudioRoomDisconnect(userId, roomId, room);
    }
  });

  // join seats
  socket.on(SocketAudioChannels.joinSeat, async ({ roomId, seatKey }) => {
    const ensureRoomExists = audioRoomPolicy.ensureRoomExists(roomId);
    const ensureJoinSeat = await audioRoomPolicy.ensureJoinSeat(
      roomId,
      userId,
      seatKey
    );
    if (ensureRoomExists == false) return;
    if (ensureJoinSeat == false) return;

    const room = audioRoom[roomId];
    const member = userObj;

    let message: IRoomMessage = {
      name: userDetails.name as string,
      avatar: userDetails.avatar as string,
      uid: userDetails.uid as string,
      userId: userDetails.userId as number,
      country: userDetails.country as string,
      _id: userDetails._id as string,
      text: `joined ${seatKey}`,
      currentBackground: userDetails.currentLevelBackground as string,
      currentTag: userDetails.currentLevelTag as string,
      currentLevel: userDetails.level as number,
      equipedStoreItems: userObj.equipedStoreItems,
    };

    if (
      !isEmptyObject(room.premiumSeat.member) &&
      (room.premiumSeat.member as IMemberDetails)._id == userId
    ) {
      message.text = "left premiumSeat";
      room.premiumSeat.member = {};
      socketResponse(io, SocketAudioChannels.SendMessage, roomId, {
        success: true,
        message: "Successfully left the seat",
        data: message,
      });
      socketResponse(io, SocketAudioChannels.leaveSeat, roomId, {
        success: true,
        message: "Successfully left the seat",
        data: {
          seatKey: "premiumSeat",
          member: {},
        },
      });
    }
    for (const [seatKey, seat] of Object.entries(room.seats)) {
      if (
        !isEmptyObject(seat.member) &&
        (seat.member as IMemberDetails)._id == userId
      ) {
        message.text = `left ${seatKey}`;
        room.seats[seatKey].member = {};
        socketResponse(io, SocketAudioChannels.SendMessage, roomId, {
          success: true,
          message: "Successfully left the seat",
          data: message,
        });
        socketResponse(io, SocketAudioChannels.leaveSeat, roomId, {
          success: true,
          message: "Successfully left the seat",
          data: {
            seatKey,
            member: {},
          },
        });
      }
    }

    if (seatKey === "premiumSeat")
      room.premiumSeat.member = member! as IMemberDetails;
    else room.seats[seatKey].member = member! as IMemberDetails;

    if (room.messages.length >= 100) room.messages.shift();
    room.messages.push(message);
    socketResponse(io, SocketAudioChannels.SendMessage, roomId, {
      success: true,
      message: "Successfully joined the seat",
      data: message,
    });
    socketResponse(io, SocketAudioChannels.joinSeat, roomId, {
      success: true,
      message: "Successfully joined the seat",
      data: {
        seatKey,
        member: member,
      },
    });
  });

  // leave seat
  socket.on(SocketAudioChannels.leaveSeat, async ({ roomId, seatKey }) => {
    const ensureRightSeatType = audioRoomPolicy.ensureRightSeatType(seatKey);
    const ensureRoomExists = audioRoomPolicy.ensureRoomExists(roomId);
    const ensureLeaveSeat = audioRoomPolicy.ensureLeaveSeat(
      roomId,
      userId,
      seatKey
    );
    if (ensureRightSeatType == false) return;
    if (ensureRoomExists == false) return;
    if (ensureLeaveSeat == false) return;

    if (seatKey == "premiumSeat") audioRoom[roomId].premiumSeat.member = {};
    else audioRoom[roomId].seats[seatKey].member = {};

    const message: IRoomMessage = {
      name: userDetails.name as string,
      avatar: userDetails.avatar as string,
      uid: userDetails.uid as string,
      userId: userDetails.userId as number,
      country: userDetails.country as string,
      _id: userDetails._id as string,
      text: `left ${seatKey}`,
      currentBackground: userDetails.currentLevelBackground as string,
      currentTag: userDetails.currentLevelTag as string,
      currentLevel: userDetails.level as number,
      equipedStoreItems: userObj.equipedStoreItems,
    };
    if (audioRoom[roomId].messages.length >= 100)
      audioRoom[roomId].messages.shift();
    audioRoom[roomId].messages.push(message);
    socketResponse(io, SocketAudioChannels.SendMessage, roomId, {
      success: true,
      message: "Successfully left the seat",
      data: message,
    });
    socketResponse(io, SocketAudioChannels.leaveSeat, roomId, {
      success: true,
      message: "Successfully left the seat",
      data: {
        seatKey,
        member: {},
      },
    });
  });

  // remove user from seat
  socket.on(SocketAudioChannels.RemoveFromSeat, ({ roomId, seatKey }) => {
    const ensureRightSeatType = audioRoomPolicy.ensureRightSeatType(seatKey);
    const ensureRoomExists = audioRoomPolicy.ensureRoomExists(roomId);
    const ensureIsHost = audioRoomPolicy.ensureIsHost(roomId, userId);
    if (ensureRightSeatType == false) return;
    if (ensureRoomExists == false) return;
    if (ensureIsHost == false) return;
    const room = audioRoom[roomId];
    let details: IMemberDetails;
    if (seatKey === "premiumSeat") {
      if (isEmptyObject(room.premiumSeat.member)) return;
      details = room.premiumSeat.member as IMemberDetails;
      room.premiumSeat.member = {};
    } else {
      if (isEmptyObject(room.seats[seatKey].member)) return;
      details = room.seats[seatKey].member as IMemberDetails;
      room.seats[seatKey].member = {};
    }

    const message: IRoomMessage = {
      name: userDetails.name as string,
      avatar: userDetails.avatar as string,
      uid: userDetails.uid as string,
      userId: userDetails.userId as number,
      country: userDetails.country as string,
      _id: userDetails._id as string,
      text: `removed ${details.name} from ${seatKey}`,
      currentBackground: userDetails.currentLevelBackground as string,
      currentTag: userDetails.currentLevelTag as string,
      currentLevel: userDetails.level as number,
      equipedStoreItems: userObj.equipedStoreItems,
    };

    if (audioRoom[roomId].messages.length >= 100)
      audioRoom[roomId].messages.shift();
    audioRoom[roomId].messages.push(message);
    socketResponse(io, SocketAudioChannels.SendMessage, roomId, {
      success: true,
      message: "Successfully removed from the seat",
      data: message,
    });
    socketResponse(io, SocketAudioChannels.leaveSeat, roomId, {
      success: true,
      message: "Successfully removed from the seat",
      data: {
        seatKey,
        member: {},
      },
    });
  });

  // mute unmute user
  socket.on(SocketAudioChannels.MuteUnmute, ({ roomId, targetId }) => {
    const ensureRoomExists = audioRoomPolicy.ensureRoomExists(roomId);
    const ensureHasMember = audioRoomPolicy.ensureHasMember(roomId, targetId);
    const ensureIsOnSeat = audioRoomPolicy.ensureIsOnSeat(roomId, targetId);
    if (ensureRoomExists == false) return;
    if (ensureHasMember == false) return;
    if (ensureIsOnSeat == false) return;

    const room = audioRoom[roomId];
    const targetSocketId = onlineUsers.get(targetId);
    if (!targetSocketId) return;
    let targetMember = room.membersDetails.find(
      (member) => member._id.toString() === targetId
    );

    if (targetId == room.hostDetails?._id) targetMember = room.hostDetails;
    if (!targetMember) return;

    if (room.mutedUsers.has(targetId)) {
      if (userId != targetId) {
        socketResponse(io, SocketChannels.error, socket.id, {
          success: false,
          message: "you can only unmute yourself",
        });
        return;
      }
      room.mutedUsers.delete(targetId);
      targetMember.isMuted = false;
      socketResponse(io, SocketAudioChannels.MuteUnmute, targetSocketId, {
        success: true,
        message: "Successfully unmuted the user",
        data: {
          isMuted: false,
          mutedUsers: Array.from(room.mutedUsers),
        },
      });
    } else {
      if (
        userId != targetId &&
        userId != room.hostDetails?._id &&
        room.adminDetails.includes(userId) == false
      ) {
        socketResponse(io, SocketChannels.error, socket.id, {
          success: false,
          message: "only the host, admins and you can mute yourself",
        });
        return;
      }
      room.mutedUsers.add(targetId);
      targetMember.isMuted = true;
      socketResponse(io, SocketAudioChannels.MuteUnmute, targetSocketId, {
        success: true,
        message: "Successfully muted the user",
        data: {
          isMuted: true,
          mutedUsers: Array.from(room.mutedUsers),
        },
      });
    }

    const serializedRoom: ISearializedAudioRoom = {
      title: room.title,
      numberOfSeats: room.numberOfSeats,
      announcement: room.announcement,
      roomId: room.roomId,
      currentRocketFuel: room.currentRocketFuel,
      currentRocketLevel: room.currentRocketLevel,
      currentRocketMilestone: room.currentRocketMilestone,
      roomTotalTransaction: room.roomTotalTransaction,
      rocketFuelPercentage:
        room.currentRocketFuel / room.currentRocketMilestone,
      hostGifts: room.hostGifts,
      hostBonus: room.hostBonus,
      hostDetails: room.hostDetails,
      adminDetails: room.adminDetails,
      premiumSeat: room.premiumSeat,
      seats: room.seats,
      messages: room.messages,
      createdAt: room.createdAt,
      members: Array.from(room.members),
      membersDetails: room.membersDetails,
      bannedUsers: Array.from(room.bannedUsers),
      mutedUsers: Array.from(room.mutedUsers),
      ranking: room.ranking,
      chatPrivacy: room.chatPrivacy,
      duration: Math.floor(
        (new Date().getTime() - room.createdAt.getTime()) / 1000
      ),
      isHostPresent: room.isHostPresent,
      isLocked: room.isLocked,
    };

    socketResponse(io, SocketAudioChannels.RoomDetails, roomId, {
      message: "Successfully updated the room",
      success: true,
      data: serializedRoom,
    });
  });

  // take leave from room
  socket.on(SocketAudioChannels.LeaveAudioRoom, ({ roomId }) => {
    const ensureRoomExists = audioRoomPolicy.ensureRoomExists(roomId);
    const ensureHasMember = audioRoomPolicy.ensureHasMember(roomId, userId);
    if (ensureRoomExists == false) return;
    if (ensureHasMember == false) return;

    const room = audioRoom[roomId];
    const socketInstance = SocketServer.getInstance();
    socketInstance.handleAudioRoomDisconnect(userId, roomId, room);
  });

  // send message
  socket.on(SocketAudioChannels.SendMessage, ({ roomId, text }) => {
    const canSendMessage = audioRoomPolicy.enureCanSendMessage(roomId, userId);
    if (canSendMessage == false) return;

    const room = audioRoom[roomId];
    const message: IRoomMessage = {
      name: userDetails.name as string,
      avatar: userDetails.avatar as string,
      uid: userDetails.uid as string,
      userId: userDetails.userId as number,
      country: userDetails.country as string,
      _id: userDetails._id as string,
      text: text,
      currentBackground: userDetails.currentLevelBackground as string,
      currentTag: userDetails.currentLevelTag as string,
      currentLevel: userDetails.level as number,
      equipedStoreItems: userObj.equipedStoreItems,
    };
    room.messages.push(message);
    if (room.messages.length >= 100) room.messages.shift();
    socketResponse(io, SocketAudioChannels.SendMessage, roomId, {
      success: true,
      message: "Successfully sent message",
      data: message,
    });
  });

  // send audio emoji
  socket.on(
    SocketAudioChannels.SendAudioEmoji,
    ({ roomId, seatKey, emoji }) => {
      const roomExists = audioRoomPolicy.ensureRoomExists(roomId);
      if (roomExists == false) return;

      socketResponse(io, SocketAudioChannels.SendAudioEmoji, roomId, {
        success: true,
        message: "Successfully sent emoji",
        data: {
          seatKey,
          emoji,
          sender: userDetails.name,
        },
      });
    }
  );

  // ban user
  socket.on(SocketAudioChannels.BanUser, ({ roomId, targetId }) => {
    const ensureIsHost = audioRoomPolicy.ensureIsHost(roomId, userId);
    const ensureRoomExists = audioRoomPolicy.ensureRoomExists(roomId);
    const ensureHasMember = audioRoomPolicy.ensureHasMember(roomId, targetId);

    if (ensureIsHost == false) return;
    if (ensureRoomExists == false) return;
    if (ensureHasMember == false) return;

    if (targetId === userId) {
      socketResponse(io, SocketChannels.error, socket.id, {
        success: false,
        message: "You can't ban yourself",
      });
    }
    const room = audioRoom[roomId];
    room.bannedUsers.add(targetId);
    const socketInstance = SocketServer.getInstance();
    socketResponse(io, SocketAudioChannels.BanUser, roomId, {
      success: true,
      message: "Successfully banned the user",
      data: {
        bannedUsers: Array.from(room.bannedUsers),
      },
    });
    socketInstance.handleAudioRoomDisconnect(targetId, roomId, room);
  });

  // unban user
  socket.on(SocketAudioChannels.UnBanUser, ({ roomId, targetId }) => {
    const ensureIsHost = audioRoomPolicy.ensureIsHost(roomId, userId);
    const ensureRoomExists = audioRoomPolicy.ensureRoomExists(roomId);
    if (ensureIsHost == false) return;
    if (ensureRoomExists == false) return;

    const room = audioRoom[roomId];
    if (room.bannedUsers.has(targetId)) room.bannedUsers.delete(targetId);
    socketResponse(io, SocketAudioChannels.UnBanUser, roomId, {
      success: true,
      message: "Successfully unbanned the user",
      data: {
        bannedUsers: Array.from(room.bannedUsers),
      },
    });
  });

  // Make admin
  socket.on(SocketAudioChannels.MakeAdmin, ({ roomId, targetId }) => {
    const canMakeAdmin = audioRoomPolicy.ensureCanMakeAdmin(
      roomId,
      userId,
      targetId
    );
    if (canMakeAdmin == false) return;
    const room = audioRoom[roomId];
    room.adminDetails.push(targetId);
    socketResponse(io, SocketAudioChannels.MakeAdmin, roomId, {
      success: true,
      message: "Successfully made admin",
      data: {
        adminDetails: room.adminDetails,
      },
    });
  });

  // Remove admin
  socket.on(SocketAudioChannels.RemoveAdmin, ({ roomId, targetId }) => {
    const removeAdmin = audioRoomPolicy.ensureCanRemoveAdmin(roomId, userId);
    if (removeAdmin == false) return;
    const room = audioRoom[roomId];
    room.adminDetails = room.adminDetails.filter((admin) => admin != targetId);
    socketResponse(io, SocketAudioChannels.RemoveAdmin, roomId, {
      success: true,
      message: "Successfully removed admin",
      data: {
        adminDetails: room.adminDetails,
      },
    });
  });

  // lock unlock seat
  socket.on(SocketAudioChannels.LockUnLockAudioSeat, ({ roomId, seatKey }) => {
    const roomExists = audioRoomPolicy.ensureRoomExists(roomId);
    const ensureIsHost = audioRoomPolicy.ensureIsHost(roomId, userId);
    const rightSeatStype = audioRoomPolicy.ensureRightSeatType(seatKey);
    if (roomExists == false) return;
    if (ensureIsHost == false) return;
    if (rightSeatStype == false) return;
    const room = audioRoom[roomId];

    if (seatKey === "premiumSeat") {
      room.premiumSeat.available = !room.premiumSeat.available;
      socketResponse(io, SocketAudioChannels.LockUnLockAudioSeat, roomId, {
        success: true,
        message: "Successfully updated premium seat availability",
        data: {
          seatKey,
          available: room.premiumSeat.available,
        },
      });
    } else {
      room.seats[seatKey].available = !room.seats[seatKey].available;
      socketResponse(io, SocketAudioChannels.LockUnLockAudioSeat, roomId, {
        success: true,
        message: `Successfully updated ${seatKey} availability`,
        data: {
          seatKey,
          available: room.seats[seatKey].available,
        },
      });
    }
  });

  // update seat count
  socket.on(
    SocketAudioChannels.UpdateAudioSeatCount,
    ({ roomId, newSeatCount }) => {
      const roomExists = audioRoomPolicy.ensureRoomExists(roomId);
      if (roomExists == false) return;

      const room = audioRoom[roomId];

      // If the seat count is already the same → no update needed
      if (room.numberOfSeats === newSeatCount) {
        socketResponse(io, SocketChannels.error, roomId, {
          success: false,
          message: "Seat count is already updated.",
          data: {},
        });
        return;
      }

      // Otherwise update & notify
      // creating new empty seats
      if (room.numberOfSeats < newSeatCount) {
        for (let i = room.numberOfSeats + 1; i <= newSeatCount; i++) {
          room.seats[`seat-${i}`] = {
            member: {},
            available: true,
          };
        }
        room.numberOfSeats = newSeatCount;
      }
      //removing excess seats
      else {
        for (let i = newSeatCount + 1; i <= room.numberOfSeats; i++) {
          if (isEmptyObject(room.seats[`seat-${i}`].member)) {
            delete room.seats[`seat-${i}`];
            continue;
          }
          const leftUserDetails = room.membersDetails.filter(
            (member) =>
              member._id ==
              (room.seats[`seat-${i}`].member as IMemberDetails)._id
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
          message.text = `left seat-${i}`;

          socketResponse(io, SocketAudioChannels.SendMessage, roomId, {
            success: true,
            message: "Successfully left the seat",
            data: message,
          });
          socketResponse(io, SocketAudioChannels.leaveSeat, roomId, {
            success: true,
            message: "Successfully left the seat",
            data: {
              seatKey: `seat-${i}`,
              member: {},
            },
          });
          delete room.seats[`seat-${i}`];
        }
        room.numberOfSeats = newSeatCount;
      }

      const serializedRoom: ISearializedAudioRoom = {
        title: room.title,
        numberOfSeats: room.numberOfSeats,
        announcement: room.announcement,
        roomId: room.roomId,
        currentRocketFuel: room.currentRocketFuel,
        currentRocketLevel: room.currentRocketLevel,
        currentRocketMilestone: room.currentRocketMilestone,
        roomTotalTransaction: room.roomTotalTransaction,
        rocketFuelPercentage:
          room.currentRocketFuel / room.currentRocketMilestone,
        hostGifts: room.hostGifts,
        hostBonus: room.hostBonus,
        hostDetails: room.hostDetails,
        adminDetails: room.adminDetails,
        premiumSeat: room.premiumSeat,
        seats: room.seats,
        messages: room.messages,
        createdAt: room.createdAt,
        bannedUsers: Array.from(room.bannedUsers),
        members: Array.from(room.members),
        membersDetails: room.membersDetails,
        mutedUsers: Array.from(room.mutedUsers),
        ranking: room.ranking,
        chatPrivacy: room.chatPrivacy,
        duration: Math.floor(
          (new Date().getTime() - room.createdAt.getTime()) / 1000
        ),
        isHostPresent: room.isHostPresent,
        isLocked: room.isLocked,
      };
      socketResponse(io, SocketAudioChannels.RoomDetails, roomId, {
        success: true,
        message: "Successfully fetched room details",
        data: serializedRoom,
      });
    }
  );

  // update announcement
  socket.on(
    SocketAudioChannels.UpdateAudioAnnouncement,
    ({ roomId, announcement }) => {
      const isHost = audioRoomPolicy.ensureIsHost(roomId, userId);
      if (isHost == false) return;
      const room = audioRoom[roomId];
      room.announcement = announcement;
      socketResponse(io, SocketAudioChannels.UpdateAudioAnnouncement, roomId, {
        success: true,
        message: "Successfully updated announcement",
        data: {
          announcement: room.announcement,
        },
      });
    }
  );

  // update title
  socket.on(SocketAudioChannels.UpdateAudioTitle, ({ roomId, title }) => {
    const isHost = audioRoomPolicy.ensureIsHost(roomId, userId);
    if (isHost == false) return;
    const room = audioRoom[roomId];
    room.title = title;
    socketResponse(io, SocketAudioChannels.UpdateAudioTitle, roomId, {
      success: true,
      message: "Successfully updated title",
      data: {
        title: room.title,
      },
    });
  });

  // set privacy status
  socket.on(
    SocketAudioChannels.SetAudioPrivacyStatus,
    ({ roomId, password }) => {
      const isHost = audioRoomPolicy.ensureIsHost(roomId, userId);
      if (isHost == false) return;
      const room = audioRoom[roomId];
      // if room is locked -> unlocking it
      if (room.isLocked) {
        if (room.password !== password) {
          socketResponse(io, SocketChannels.error, socket.id, {
            success: false,
            message: "wrong password, room remains private",
            data: {
              password: password,
            },
          });
          return;
        }
        room.isLocked = false;
        room.password = undefined;
      }
      // if room is unlocked -> locking it
      else {
        room.isLocked = true;
        room.password = password;
      }

      socketResponse(io, SocketAudioChannels.SetAudioPrivacyStatus, socket.id, {
        success: true,
        message: `Successfully updated privacy status`,
        data: {
          isLocked: room.isLocked,
        },
      });
    }
  );

  // set chat privacy
  socket.on(
    SocketAudioChannels.SetAudioChatPrivacyStatus,
    ({ roomId, privacyType }) => {
      const isHost = audioRoomPolicy.ensureIsHost(roomId, userId);
      const rightPrivacyType =
        audioRoomPolicy.ensureRightChatPrivacyType(privacyType);
      if (rightPrivacyType == false) return;
      if (isHost == false) return;
      const room = audioRoom[roomId];
      room.chatPrivacy = privacyType;
      socketResponse(
        io,
        SocketAudioChannels.SetAudioChatPrivacyStatus,
        roomId,
        {
          success: true,
          message: "Successfully updated chat privacy status",
          data: {
            chatPrivacy: room.chatPrivacy,
          },
        }
      );
    }
  );

  // imvite user to seat
  socket.on(
    SocketAudioChannels.InviteUserToSeat,
    async ({ roomId, seatKey, targetId }) => {
      const isHost = audioRoomPolicy.ensureIsHost(roomId, userId);
      const joinSeat = await audioRoomPolicy.ensureJoinSeat(
        roomId,
        targetId,
        seatKey
      );
      if (joinSeat == false) return;
      if (isHost == false) return;

      const targetSocketId = onlineUsers.get(targetId);

      socketResponse(
        io,
        SocketAudioChannels.AudioSeatInvitations,
        targetSocketId ?? roomId,
        {
          success: true,
          message: `you have been invited to ${seatKey}`,
          data: {
            seatKey,
            targetId,
          },
        }
      );
      socketResponse(io, SocketAudioChannels.InviteUserToSeat, socket.id, {
        success: true,
        message: `Successfully invited user to ${seatKey}`,
        data: { seatKey, targetId },
      });
    }
  );

  // search audio room
  socket.on(SocketAudioChannels.AudioRoomSearch, ({ title }) => {
    const allRoomSerialized: ISearializedAudioRoom[] = [];
    for (const [room, roomData] of Object.entries(audioRoom)) {
      if (
        roomData.roomId.toLowerCase().includes(title.toLowerCase()) ||
        roomData.title.toLowerCase().includes(title.toLowerCase())
      ) {
        const obj: ISearializedAudioRoom = {
          title: roomData.title,
          numberOfSeats: roomData.numberOfSeats,
          announcement: roomData.announcement,
          roomId: roomData.roomId,
          currentRocketFuel: roomData.currentRocketFuel,
          currentRocketLevel: roomData.currentRocketLevel,
          currentRocketMilestone: roomData.currentRocketMilestone,
          roomTotalTransaction: roomData.roomTotalTransaction,
          rocketFuelPercentage:
            roomData.currentRocketFuel / roomData.currentRocketMilestone,
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
            (new Date().getTime() - roomData.createdAt.getTime()) / 1000
          ),
          isHostPresent: roomData.isHostPresent,
          isLocked: roomData.isLocked,
        };
        allRoomSerialized.push(obj);
      }
    }

    socketResponse(io, SocketAudioChannels.AudioRoomSearch, socket.id, {
      success: true,
      message: "Successfully fetched all audio rooms",
      data: allRoomSerialized,
    });
  });

  // get my audio room
  socket.on(SocketAudioChannels.GetMyAudioRoom, () => {
    const allRoomSerialized: ISearializedAudioRoom[] = [];
    for (const [room, roomData] of Object.entries(audioRoom)) {
      if (roomData.hostId.toString() == userId.toString()) {
        const obj: ISearializedAudioRoom = {
          title: roomData.title,
          numberOfSeats: roomData.numberOfSeats,
          announcement: roomData.announcement,
          roomId: roomData.roomId,
          currentRocketFuel: roomData.currentRocketFuel,
          currentRocketLevel: roomData.currentRocketLevel,
          currentRocketMilestone: roomData.currentRocketMilestone,
          roomTotalTransaction: roomData.roomTotalTransaction,
          rocketFuelPercentage:
            roomData.currentRocketFuel / roomData.currentRocketMilestone,
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
            (new Date().getTime() - roomData.createdAt.getTime()) / 1000
          ),
          isHostPresent: roomData.isHostPresent,
          isLocked: roomData.isLocked,
        };
        allRoomSerialized.push(obj);
      }
    }

    socketResponse(io, SocketAudioChannels.GetMyAudioRoom, socket.id, {
      success: true,
      message: "Successfully fetched your audio rooms",
      data: allRoomSerialized[0],
    });
  });

  // my recent visited Rooms
  socket.on(SocketAudioChannels.RecentVisitedAudioRooms, () => {
    const allRoomSerialized: ISearializedAudioRoom[] = [];
    const normalizedVisitHistory: { roomId: string; timestamp: string }[] = [];
    const myVisitedRooms = audioRoomVisitedHistory[userId];
    if (!myVisitedRooms) {
      socketResponse(
        io,
        SocketAudioChannels.RecentVisitedAudioRooms,
        socket.id,
        {
          success: true,
          message: "Successfully fetched your recent visited audio rooms",
          data: [],
        }
      );
      return;
    }
    for (const [roomId, timestamp] of Object.entries(myVisitedRooms)) {
      const obj: { roomId: string; timestamp: string } = {
        roomId,
        timestamp,
      };
      normalizedVisitHistory.push(obj);
    }
    normalizedVisitHistory.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    for (let i = 0; i < normalizedVisitHistory.length; i++) {
      const room = audioRoom[normalizedVisitHistory[i].roomId];
      const obj: ISearializedAudioRoom = {
        title: room.title,
        numberOfSeats: room.numberOfSeats,
        announcement: room.announcement,
        roomId: room.roomId,
        currentRocketFuel: room.currentRocketFuel,
        currentRocketLevel: room.currentRocketLevel,
        currentRocketMilestone: room.currentRocketMilestone,
        roomTotalTransaction: room.roomTotalTransaction,
        rocketFuelPercentage:
          room.currentRocketFuel / room.currentRocketMilestone,
        hostGifts: room.hostGifts,
        hostBonus: room.hostBonus,
        hostDetails: room.hostDetails,
        adminDetails: room.adminDetails,
        premiumSeat: room.premiumSeat,
        seats: room.seats,
        messages: room.messages,
        createdAt: room.createdAt,
        members: Array.from(room.members),
        membersDetails: room.membersDetails,
        bannedUsers: Array.from(room.bannedUsers),
        mutedUsers: Array.from(room.mutedUsers),
        ranking: room.ranking,
        chatPrivacy: room.chatPrivacy,
        duration: Math.floor(
          (new Date().getTime() - room.createdAt.getTime()) / 1000
        ),
        isHostPresent: room.isHostPresent,
        isLocked: room.isLocked,
      };
      allRoomSerialized.push(obj);
    }

    socketResponse(io, SocketAudioChannels.RecentVisitedAudioRooms, socket.id, {
      success: true,
      message: "Successfully fetched your recent visited audio rooms",
      data: allRoomSerialized,
    });
  });

  // clear chat history
  socket.on(SocketAudioChannels.ClearChatHistory, ({roomId}) => {
    const isHost = audioRoomPolicy.ensureIsHost(roomId, userId);
    if (isHost == false) return;
    const room = audioRoom[roomId];
    room.messages = [];
    socketResponse(io, SocketAudioChannels.ClearChatHistory, roomId, {
      success: true,
      message: "Successfully cleared chat history",
      data: [],
    });
  } );

  // lock all seat 
  socket.on(SocketAudioChannels.LockAllSeat, ({ roomId }) => {
    const isHost = audioRoomPolicy.ensureIsHost(roomId, userId);
    if (isHost == false) return;
    const room = audioRoom[roomId];
    for (const [seatKey, seat] of Object.entries(room.seats)) {
      room.seats[seatKey].available = false;
    }
    room.premiumSeat.available = false;
    socketResponse(io, SocketAudioChannels.LockAllSeat, roomId, {
      success: true,
      message: "Successfully locked all seats",
      data: {
        seats: room.seats,
        premiumSeat: room.premiumSeat,
      },
    });
  });
  // unlock all seat
  socket.on(SocketAudioChannels.UnlockAllSeats, ({ roomId }) => {
    const isHost = audioRoomPolicy.ensureIsHost(roomId, userId);
    if (isHost == false) return;
    const room = audioRoom[roomId];
    for (const [seatKey, seat] of Object.entries(room.seats)) {
      room.seats[seatKey].available = true;
    }
    room.premiumSeat.available = true;
    socketResponse(io, SocketAudioChannels.UnlockAllSeats, roomId, {
      success: true,
      message: "Successfully unlocked all seats",
      data: {
        seats: room.seats,
        premiumSeat: room.premiumSeat,
      },
    });
  });
  
};
