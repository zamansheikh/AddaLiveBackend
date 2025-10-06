import { Socket, Server } from "socket.io";
import {
  RoomTypes,
  SocketAudioChannels,
  SocketChannels,
} from "../../Utils/enums";
import { REQUEST_URI_TOO_LONG, StatusCodes } from "http-status-codes";
import AppError from "../../errors/app_errors";
import { IUserDocument } from "../../../models/user/user_model_interface";
import { IUserRepository } from "../../../repository/users/user_repository";
import mongoose from "mongoose";
import { IMyBucketRepository } from "../../../repository/store/my_bucket_repository";
import { IStoreCategoryRepository } from "../../../repository/store/store_category_repository";
import {
  getEquipedItemObjects,
  isEmptyObject,
  socketResponse,
} from "../../Utils/helper_functions";
import {
  IAudioRoomData,
  IAudioSeats,
  IMemberDetails,
  IRoomMessage,
  ISearializedAudioRoom,
} from "../interface/socket_interface";
import { AudioRoomPolicy } from "../policies/audio_room_policy";
import { ISerializedRoomData } from "./group_room_handler";
import SocketServer from "../socket_server";

export const registerAudioRoomHandler = async (
  io: Server,
  socket: Socket,
  onlineUsers: Map<string, string>,
  audioRoom: Record<string, IAudioRoomData>,
  userRepository: IUserRepository,
  bucketRepository: IMyBucketRepository,
  categoryRepository: IStoreCategoryRepository
) => {
  // userId -> mongoose object_id
  const userId = socket.handshake.query.userId as string;
  // fetching the relavent informations
  const userDetails = await userRepository.getUserDetailsSelectedField(userId, [
    "name",
    "avatar",
    "uid",
    "country",
    "currentLevelBackground",
    "currentLevelTag",
    "level",
  ]);
  // attaching the equiped items from the store.
  const userObj = userDetails.toObject();
  userObj.equipedStoreItems = await getEquipedItemObjects(
    bucketRepository,
    categoryRepository,
    userId
  );
  if (!userId) throw new AppError(StatusCodes.NOT_FOUND, "User not found");

  // creating policy object
  const audioRoomPolicy = new AudioRoomPolicy(audioRoom, io, socket);
  // channel to create audio room
  socket.on(
    SocketAudioChannels.CreateAudioRoom,
    ({ roomId, title, numberOfSeats }) => {
      // validating input data
      audioRoomPolicy.ensureCreateRoomPolicy(roomId, title, numberOfSeats);
      const membersDetails: IMemberDetails = {
        name: userDetails.name as string,
        avatar: userDetails.avatar as string,
        uid: userDetails.uid as string,
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
        title: title,
        numberOfSeats: numberOfSeats,
        roomId: roomId,
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
      };

      audioRoom[roomId] = createdRoom;
      socket.join(roomId);
      const serializedRoom: ISearializedAudioRoom = {
        title: createdRoom.title,
        numberOfSeats: createdRoom.numberOfSeats,
        roomId: createdRoom.roomId,
        hostGifts: createdRoom.hostGifts,
        hostBonus: createdRoom.hostBonus,
        hostDetails: createdRoom.hostDetails,
        premiumSeat: createdRoom.premiumSeat,
        seats: createdRoom.seats,
        messages: createdRoom.messages,
        createdAt: createdRoom.createdAt,
        members: Array.from(createdRoom.members),
        membersDetails: createdRoom.membersDetails,
        bannedUsers: Array.from(createdRoom.bannedUsers),
        mutedUsers: Array.from(createdRoom.mutedUsers),
        ranking: createdRoom.ranking,
        duration: Math.floor(
          (new Date().getTime() - createdRoom.createdAt.getTime()) / 1000
        ),
      };
      socketResponse(io, SocketAudioChannels.CreateAudioRoom, socket.id, {
        success: true,
        message: "Successfully room created",
        data: serializedRoom,
      });
    }
  );

  // get all audio rooms
  socket.on(SocketAudioChannels.GetAllAudioRooms, () => {
    const serializedRooms: ISearializedAudioRoom[] = [];
    for (const [room, roomData] of Object.entries(audioRoom)) {
      const obj = {
        title: roomData.title,
        numberOfSeats: roomData.numberOfSeats,
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
      serializedRooms.push(obj);
    }
    socketResponse(io, SocketAudioChannels.GetAllAudioRooms, socket.id, {
      success: true,
      message: "Successfully fetched all audio rooms",
      data: serializedRooms,
    });
  });

  // user join audio room
  socket.on(SocketAudioChannels.JoinAudioRoom, ({ roomId }) => {
    audioRoomPolicy.ensureUserCanJoin(roomId, userId);
    const room = audioRoom[roomId];
    const membersDetails: IMemberDetails = {
      name: userDetails.name as string,
      avatar: userDetails.avatar as string,
      uid: userDetails.uid as string,
      country: userDetails.country as string,
      _id: userDetails._id as string,
      currentBackground: userDetails.currentLevelBackground as string,
      currentTag: userDetails.currentLevelTag as string,
      currentLevel: userDetails.level as number,
      equipedStoreItems: userObj.equipedStoreItems,
      totalGiftSent: 0,
      isMuted: false,
    };
    room.members.add(userId);
    room.membersDetails.push(membersDetails);
    room.ranking.push(membersDetails);
    socket.join(roomId);
    const message: IRoomMessage = {
      name: userDetails.name as string,
      avatar: userDetails.avatar as string,
      uid: userDetails.uid as string,
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
    const serializedRoom: ISearializedAudioRoom = {
      title: room.title,
      numberOfSeats: room.numberOfSeats,
      roomId: room.roomId,
      hostGifts: room.hostGifts,
      hostBonus: room.hostBonus,
      hostDetails: room.hostDetails,
      premiumSeat: room.premiumSeat,
      seats: room.seats,
      messages: room.messages,
      createdAt: room.createdAt,
      members: Array.from(room.members),
      membersDetails: room.membersDetails,
      bannedUsers: Array.from(room.bannedUsers),
      mutedUsers: Array.from(room.mutedUsers),
      ranking: room.ranking,
      duration: Math.floor(
        (new Date().getTime() - room.createdAt.getTime()) / 1000
      ),
    };
    socketResponse(io, SocketAudioChannels.JoinAudioRoom, socket.id, {
      success: true,
      message: "Successfully joined the room",
      data: serializedRoom,
    });
  });

  // join seats
  socket.on(SocketAudioChannels.joinSeat, async ({ roomId, seatKey }) => {
    if (!audioRoomPolicy.ensureRoomExists(roomId)) return;
    if (!(await audioRoomPolicy.ensureJoinSeat(roomId, userId, seatKey)))
      return;
    const room = audioRoom[roomId];
    const member = room.membersDetails.find(
      (member) => member._id.toString() === userId
    );

    if (seatKey === "premiumSeat")
      room.premiumSeat.member = member! as IMemberDetails;
    else room.seats[seatKey].member = member! as IMemberDetails;

    const message: IRoomMessage = {
      name: userDetails.name as string,
      avatar: userDetails.avatar as string,
      uid: userDetails.uid as string,
      country: userDetails.country as string,
      _id: userDetails._id as string,
      text: `joined ${seatKey}`,
      currentBackground: userDetails.currentLevelBackground as string,
      currentTag: userDetails.currentLevelTag as string,
      currentLevel: userDetails.level as number,
      equipedStoreItems: userObj.equipedStoreItems,
    };
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
    if (!audioRoomPolicy.ensureRightSeatType(seatKey)) return;
    if (!audioRoomPolicy.ensureRoomExists(roomId)) return;
    if (!audioRoomPolicy.ensureLeaveSeat(roomId, userId, seatKey)) return;
    if (seatKey == "premiumSeat") audioRoom[roomId].premiumSeat.member = {};
    else audioRoom[roomId].seats[seatKey].member = {};

    const message: IRoomMessage = {
      name: userDetails.name as string,
      avatar: userDetails.avatar as string,
      uid: userDetails.uid as string,
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
    if (!audioRoomPolicy.ensureRightSeatType(seatKey)) return;
    if (!audioRoomPolicy.ensureIsHost(roomId, userId)) return;
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
    if (!audioRoomPolicy.ensureIsHost(roomId, userId)) return;
    if (!audioRoomPolicy.ensureRoomExists(roomId)) return;
    if (!audioRoomPolicy.ensureHasMember(roomId, targetId)) return;
    if (!audioRoomPolicy.ensureIsOnSeat(roomId, targetId)) return;
    const room = audioRoom[roomId];
    const targetSocketId = onlineUsers.get(targetId);
    if (!targetSocketId) return;
    const targetMember = room.membersDetails.find(
      (member) => member._id.toString() === targetId
    );
    if (!targetMember) return;
    if (room.mutedUsers.has(targetId)) {
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
      roomId: room.roomId,
      hostGifts: room.hostGifts,
      hostBonus: room.hostBonus,
      hostDetails: room.hostDetails,
      premiumSeat: room.premiumSeat,
      seats: room.seats,
      messages: room.messages,
      createdAt: room.createdAt,
      members: Array.from(room.members),
      membersDetails: room.membersDetails,
      bannedUsers: Array.from(room.bannedUsers),
      mutedUsers: Array.from(room.mutedUsers),
      ranking: room.ranking,
      duration: Math.floor(
        (new Date().getTime() - room.createdAt.getTime()) / 1000
      ),
    };

    socketResponse(io, SocketAudioChannels.RoomDetails, roomId, {
      message: "Successfully updated the room",
      success: true,
      data: serializedRoom,
    });
  });

  // take leave from room
  socket.on(SocketAudioChannels.LeaveAudioRoom, ({ roomId }) => {
    if (!audioRoomPolicy.ensureRoomExists(roomId)) return;
    if (!audioRoomPolicy.ensureHasMember(roomId, userId)) return;
    const room = audioRoom[roomId];
    const socketInstance = SocketServer.getInstance();
    socketInstance.handleAudioRoomDisconnect(userId, roomId, room);
  });

  // send message
  socket.on(SocketAudioChannels.SendMessage, ({ roomId, text }) => {
    if (!audioRoomPolicy.ensureRoomExists(roomId)) return;
    if (!audioRoomPolicy.ensureHasMember(roomId, userId)) return;
    const room = audioRoom[roomId];
    const message: IRoomMessage = {
      name: userDetails.name as string,
      avatar: userDetails.avatar as string,
      uid: userDetails.uid as string,
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

  socket.on(SocketAudioChannels.BanUser, ({ roomId, targetId }) => {
    if (!audioRoomPolicy.ensureIsHost(roomId, userId)) return;
    if (!audioRoomPolicy.ensureRoomExists(roomId)) return;
    if (!audioRoomPolicy.ensureHasMember(roomId, targetId)) return;
    if (targetId === userId) {
      socketResponse(io, SocketChannels.error, socket.id, {
        success: false,
        message: "You can't ban yourself",
      });
    }
    const room = audioRoom[roomId];
    room.bannedUsers.add(targetId);
    const socketInstance = SocketServer.getInstance();
    socketInstance.handleAudioRoomDisconnect(userId, roomId, room);
    socketResponse(io, SocketAudioChannels.BanUser, roomId, {
      success: true,
      message: "Successfully banned the user",
      data: {
        bannedUsers: Array.from(room.bannedUsers),
      },
    });
  });
  socket.on(SocketAudioChannels.UnBanUser, ({ roomId, targetId }) => {
    if (!audioRoomPolicy.ensureIsHost(roomId, userId)) return;
    if (!audioRoomPolicy.ensureRoomExists(roomId)) return;
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
};
