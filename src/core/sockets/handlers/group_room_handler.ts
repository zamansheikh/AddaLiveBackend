import { Socket, Server } from "socket.io";
import { RoomTypes, SocketChannels } from "../../Utils/enums";
import { StatusCodes } from "http-status-codes";
import { IMemberDetails, RoomData } from "../socket_server";
import AppError from "../../errors/app_errors";
import { IUserDocument } from "../../../models/user/user_model_interface";
import { IUserRepository } from "../../../repository/users/user_repository";
import mongoose from "mongoose";
import { IMyBucketRepository } from "../../../repository/store/my_bucket_repository";
import { IStoreCategoryRepository } from "../../../repository/store/store_category_repository";
import { getEquipedItemObjects } from "../../Utils/helper_functions";

export interface ISerializedRoomData {
  hostId: string;
  roomType: RoomTypes;
  hostDetails?: IUserDocument | null;
  hostCoins: number;
  hostBonus: number;
  members: string[];
  membersDetails: IMemberDetails[];
  bannedUsers: string[];
  brodcasters: string[];
  currentBackground: string;
  currentTag: string;
  messages: {
    name: string;
    avatar: string;
    uid: string;
    country: string;
    _id: mongoose.Schema.Types.ObjectId | string;
    currentBackground: string;
    currentTag: string;
    currentLevel: number;
    text: string;
    equipedStoreItems: Record<string, string>;
  }[];
  broadcastersDetails: IMemberDetails[];
  adminDetails: IMemberDetails | null;
  callRequests: IMemberDetails[];
  mutedUsers: string[];
  title: string;
  duration: number; // in seconds
}

export async function registerGroupRoomHandler(
  io: Server,
  socket: Socket,
  onlineUsers: Map<string, string>,
  hostedRooms: Record<string, RoomData>,
  userRepository: IUserRepository,
  bucketRepository: IMyBucketRepository,
  categoryRepository: IStoreCategoryRepository
) {
  const userId = socket.handshake.query.userId as string;
  const userDetails = await userRepository.getUserDetailsSelectedField(userId, [
    "name",
    "avatar",
    "uid",
    "country",
    "currentLevelBackground",
    "currentLevelTag",
    "level",
  ]);

  console.log(userDetails);

  const userObj = userDetails.toObject();
  userObj.equipedStoreItems = await getEquipedItemObjects(
    bucketRepository,
    categoryRepository,
    userId
  );

  if (!userId) throw new AppError(StatusCodes.NOT_FOUND, "User not found");

  // send message

  socket.on(SocketChannels.sendMessage, async ({ roomId, messageText }) => {
    const room = hostedRooms[roomId];
    if (!room)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.NOT_FOUND,
        message: "This room does not exists",
      });

    if (!messageText) {
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Message text cannot be empty",
      });
    }

    const message = {
      name: userDetails.name as string,
      avatar: userDetails.avatar as string,
      uid: userDetails.uid as string,
      country: userDetails.country as string,
      _id: userDetails._id as string,
      text: messageText,
      currentBackground: userDetails.currentLevelBackground as string,
      currentTag: userDetails.currentLevelTag as string,
      currentLevel: userDetails.level as number,
      equipedStoreItems: userObj.equipedStoreItems,
    };
    if (room.messages.length >= 100) room.messages.shift();
    room.messages.push(message);
    io.to(roomId).emit(SocketChannels.sendMessage, message);
  });

  // host
  socket.on(SocketChannels.createRoom, ({ roomId, title, roomType }) => {
    if (!roomId || !title || !roomType)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "roomId, title and roomType are required",
      });

    if (!Object.values(RoomTypes).includes(roomType))
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Invalid Room Type",
      });

    const room = hostedRooms[roomId];
    if (room)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.CONFLICT,
        message: "Room Already Exists",
      });

    hostedRooms[roomId] = {
      hostId: userId,
      roomType: roomType,
      hostDetails: userDetails,
      hostCoins: 0,
      hostBonus: 0,
      currentBackground: userDetails.currentLevelBackground as string,
      currentTag: userDetails.currentLevelTag as string,
      broadcastersDetails: [
        {
          name: userDetails.name as string,
          avatar: userDetails.avatar as string,
          uid: userDetails.uid as string,
          country: userDetails.country as string,
          _id: userDetails._id as string,
          currentBackground: userDetails.currentLevelBackground as string,
          currentTag: userDetails.currentLevelTag as string,
          currentLevel: userDetails.level as number,
          equipedStoreItems: userObj.equipedStoreItems,
        },
      ],
      messages: [],
      members: new Set([userId]),
      membersDetails: [],
      bannedUsers: new Set(),
      brodcasters: new Set([userId]),
      adminDetails: null,
      callRequests: new Set(),
      mutedUsers: new Set(),
      title: title,
      createdAt: new Date(),
    };
    socket.join(roomId);

    const serializedRoom: ISerializedRoomData[] = [];

    for (const [room, roomData] of Object.entries(hostedRooms)) {
      const obj = {
        hostId: roomData.hostId,
        roomType: roomData.roomType,
        roomId: room,
        messages: roomData.messages,
        hostDetails: roomData.hostDetails,
        hostCoins: roomData.hostCoins,
        hostBonus: roomData.hostBonus,
        broadcastersDetails: roomData.broadcastersDetails,
        currentBackground: roomData.currentBackground,
        currentTag: roomData.currentTag,
        members: Array.from(roomData.members),
        membersDetails: roomData.membersDetails,
        bannedUsers: Array.from(roomData.bannedUsers),
        brodcasters: Array.from(roomData.brodcasters),
        adminDetails: roomData.adminDetails,
        callRequests: Array.from(roomData.callRequests),
        mutedUsers: Array.from(roomData.mutedUsers),
        title: roomData.title,
        duration: Math.floor(
          (new Date().getTime() - roomData.createdAt.getTime()) / 1000
        ),
      };
      serializedRoom.push(obj);
    }

    io.emit(SocketChannels.getRooms, serializedRoom);

    // ! if unintended users are also getting the event, use io.to(roomId),
    io.to(roomId).emit(SocketChannels.roomList, Object.keys(hostedRooms));
  });

  socket.on(SocketChannels.deleteRoom, ({ roomId }) => {
    if (!roomId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Room ID is required",
      });
    const room = hostedRooms[roomId];
    if (!room)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.NOT_FOUND,
        message: "Room doest not exists",
      });
    if (room.hostId != userId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.UNAUTHORIZED,
        message: "You are not host of this room",
      });

    io.to(roomId).emit(SocketChannels.roomClosed, {
      roomId,
      message: "Room has been closed by the host",
    });

    for (const member of room.members) {
      if (onlineUsers.has(member)) {
        const memberSocket = io.sockets.sockets.get(onlineUsers.get(member)!);
        memberSocket?.leave(roomId);
      }
    }

    delete hostedRooms[roomId];

    // ! if unintended users are also getting the event, use io.to(roomId),
    io.to(roomId).emit(SocketChannels.roomClosed, {
      roomId,
      message: "Room has been closed by the host",
    });
  });

  socket.on(SocketChannels.makeAdmin, ({ roomId, targetId }) => {
    if (!roomId || !targetId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Room ID and Target ID are required",
      });
    const room = hostedRooms[roomId];
    if (!room)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.NOT_FOUND,
        message: "This room does not exists",
      });
    if (room.hostId != userId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.UNAUTHORIZED,
        message: "You are not host of this room",
      });
    if (
      room.adminDetails != null &&
      room.adminDetails?._id.toString() === targetId
    )
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.CONTINUE,
        message: "User is already an admin",
      });
    if (room.adminDetails)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.CONTINUE,
        message: "Room already has an admin",
      });
    const broadcaster = room.broadcastersDetails.find(
      (broadcaster) => broadcaster._id.toString() === targetId
    );
    if (!broadcaster)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.NOT_FOUND,
        message: "User is not a broadcaster",
      });
    room.adminDetails = broadcaster;
    const message = {
      name: broadcaster.name as string,
      avatar: broadcaster.avatar as string,
      uid: broadcaster.uid as string,
      country: broadcaster.country as string,
      _id: broadcaster._id as string,
      text: `Has been made an admin`,
      equipedStoreItems: broadcaster.equipedStoreItems,
    };
    io.to(roomId).emit(SocketChannels.sendMessage, message);
    io.to(roomId).emit(SocketChannels.makeAdmin, {
      adminDetails: room.adminDetails,
      message: `${broadcaster.name} is now an admin`,
    });
  });

  socket.on(SocketChannels.muteUser, async ({ roomId, targetId }) => {
    if (!roomId || !targetId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Room ID and Target ID are required",
      });

    const room = hostedRooms[roomId];
    if (!room)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.NOT_FOUND,
        message: "This room does not exist",
      });

    if (room.hostId != userId && userId !== room.adminDetails?._id.toString())
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.UNAUTHORIZED,
        message: "You are not host nor admin of this room",
      });

    if (!room.brodcasters.has(targetId))
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.NOT_FOUND,
        message: "User is not in the call",
      });

    const targetIdDetails = await userRepository.getUserDetailsSelectedField(
      targetId,
      ["name", "avatar", "uid", "country"]
    );
    const targetEquipedStoreItems = await getEquipedItemObjects(
      bucketRepository,
      categoryRepository,
      targetId
    );

    let message = {
      name: targetIdDetails.name as string,
      avatar: targetIdDetails.avatar as string,
      uid: targetIdDetails.uid as string,
      country: targetIdDetails.country as string,
      _id: targetIdDetails._id as string,
      text: `left the room`,
      equipedStoreItems: targetEquipedStoreItems,
    };

    if (room.mutedUsers.has(targetId)) {
      room.mutedUsers.delete(targetId);
      message.text = "User has been unmuted";
      io.to(roomId).emit(SocketChannels.sendMessage, message);
      return io.to(roomId).emit(SocketChannels.muteUser, {
        userId: targetId,
        isMuted: false,
        mutedUsers: Array.from(room.mutedUsers),
        message: "User has been unmuted",
      });
    } else {
      room.mutedUsers.add(targetId);
      message.text = "User has been muted";
      io.to(roomId).emit(SocketChannels.sendMessage, message);
      return io.to(roomId).emit(SocketChannels.muteUser, {
        userId: targetId,
        isMuted: true,
        mutedUsers: Array.from(room.mutedUsers),
        message: "User has been muted",
      });
    }
  });

  socket.on(SocketChannels.joinCallReq, ({ roomId }) => {
    if (!roomId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Room ID is required",
      });
    const room = hostedRooms[roomId];
    // if the room exists
    if (!room)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.NOT_FOUND,
        message: "This room does not exists",
      });
    // if the user is the host
    if (room.hostId == userId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Host cannot request to join the call",
      });
    // if the user is not in the room
    if (!room.members.has(userId))
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.CONTINUE,
        message: "You are not in the room",
      });
    // if the user is banned from the room
    if (room.bannedUsers.has(userId))
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.UNAUTHORIZED,
        message: "You are banned from this room",
      });
    // if the user is already a broadcaster
    if (room.brodcasters.has(userId))
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.CONTINUE,
        message: "You are already a broadcaster",
      });
    const hasId = Array.from(room.callRequests).some(
      (request) => request._id.toString() === userId
    );
    if (hasId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.CONTINUE,
        message: "You have already sent request to join the call",
      });

    const message = {
      name: userDetails.name as string,
      avatar: userDetails.avatar as string,
      uid: userDetails.uid as string,
      country: userDetails.country as string,
      _id: userDetails._id as string,
      text: `Has requested to join the call`,
      equipedStoreItems: userObj.equipedStoreItems,
    };
    io.to(roomId).emit(SocketChannels.sendMessage, message);

    room.callRequests.add({
      name: userDetails.name as string,
      avatar: userDetails.avatar as string,
      uid: userDetails.uid as string,
      country: userDetails.country as string,
      _id: userDetails._id as string,
      equipedStoreItems: userObj.equipedStoreItems,
      currentBackground: userDetails.currentLevelBackground as string,
      currentLevel: userDetails.level as number,
      currentTag: userDetails.currentLevelTag as string,
    });
    const hostSocketId = onlineUsers.get(room.hostId);
    if (hostSocketId) {
      io.to(hostSocketId).emit(SocketChannels.joinCallReq, {
        userId,
        userDetails,
        roomId,
      });
    }
    io.to(roomId).emit(
      SocketChannels.joinCallReqList,
      Array.from(room.callRequests)
    );
  });

  socket.on(SocketChannels.joinCallReqList, ({ roomId }) => {
    if (!roomId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Room ID is required",
      });
    const room = hostedRooms[roomId];
    if (!room)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.NOT_FOUND,
        message: "This room does not exists",
      });
    // check if the request came from the host
    if (room.hostId != userId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.UNAUTHORIZED,
        message: "You are not host of this room",
      });

    io.to(socket.id).emit(
      SocketChannels.joinCallReqList,
      Array.from(room.callRequests)
    );
  });

  socket.on(SocketChannels.acceptCallReq, async ({ roomId, targetId }) => {
    if (!roomId || !targetId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Room ID and Target ID are required",
      });

    const room = hostedRooms[roomId];

    // check if the room exists
    if (!room)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.NOT_FOUND,
        message: "This room does not exists",
      });
    // check if the request came from the host
    if (room.hostId != userId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.UNAUTHORIZED,
        message: "You are not host of this room",
      });
    // check if the target user has sent a call request
    const hasId = Array.from(room.callRequests).some(
      (request) => request._id.toString() === targetId
    );
    if (!hasId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.NOT_FOUND,
        message: "User has not requested to join the call",
      });

    if (room.brodcasters.has(targetId))
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.CONTINUE,
        message: "User is already a broadcaster",
      });
    if (room.bannedUsers.has(targetId))
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.UNAUTHORIZED,
        message: "User is banned from this room",
      });
    if (room.brodcasters.size >= 4)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Maximum 3 broadcasters are allowed",
      });
    const objectToDelete = Array.from(room.callRequests).find(
      (request) => request._id.toString() === targetId
    );
    if (objectToDelete) {
      room.callRequests.delete(objectToDelete);
    }
    room.brodcasters.add(targetId);
    // ! update
    const targetUser = await userRepository.getUserDetailsSelectedField(
      targetId,
      [
        "name",
        "avatar",
        "uid",
        "country",
        "currentLevelBackground",
        "currentLevelTag",
        "level",
      ]
    );
    const targetEquipedStoreItems = await getEquipedItemObjects(
      bucketRepository,
      categoryRepository,
      targetId
    );

    room.broadcastersDetails.push({
      name: targetUser.name as string,
      avatar: targetUser.avatar as string,
      uid: targetUser.uid as string,
      country: targetUser.country as string,
      _id: targetUser._id as string,
      equipedStoreItems: targetEquipedStoreItems,
      currentBackground: targetUser.currentLevelBackground as string,
      currentLevel: targetUser.level as number,
      currentTag: targetUser.currentLevelTag as string,
    });

    const targetIdDetails = await userRepository.getUserDetailsSelectedField(
      targetId,
      ["name", "avatar", "uid", "country"]
    );

    const message = {
      name: targetIdDetails.name as string,
      avatar: targetIdDetails.avatar as string,
      uid: targetIdDetails.uid as string,
      country: targetIdDetails.country as string,
      _id: targetIdDetails._id as string,
      text: `Has joined the call`,
      equipedStoreItems: targetEquipedStoreItems,
    };
    io.to(roomId).emit(SocketChannels.sendMessage, message);

    const targetSocketId = onlineUsers.get(targetId);

    if (targetSocketId) {
      io.to(targetSocketId).emit(SocketChannels.acceptCallReq, {
        roomId,
        message: "Your call request has been accepted",
      });
    }
    io.to(roomId).emit(
      SocketChannels.broadcasterList,
      room.broadcastersDetails
    );
    // io.to(roomId).emit(
    //   SocketChannels.joinCallReqList,
    //   Array.from(room.callRequests)
    // );
  });

  socket.on(SocketChannels.broadcasterDetails, ({ roomId }) => {
    if (!roomId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Room ID is required",
      });
    const room = hostedRooms[roomId];
    if (!room)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.NOT_FOUND,
        message: "This room does not exists",
      });

    io.to(socket.id).emit(
      SocketChannels.broadcasterDetails,
      room.broadcastersDetails
    );
  });

  socket.on(SocketChannels.broadcasterList, ({ roomId }) => {
    if (!roomId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Room ID is required",
      });
    const room = hostedRooms[roomId];
    if (!room)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.NOT_FOUND,
        message: "This room does not exists",
      });
    io.to(socket.id).emit(
      SocketChannels.broadcasterList,
      room.broadcastersDetails
    );
  });

  socket.on(SocketChannels.removeBroadCaster, async ({ roomId, targetId }) => {
    if (!roomId || !targetId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Room ID and Target ID are required",
      });
    const room = hostedRooms[roomId];
    if (!room)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.NOT_FOUND,
        message: "This room does not exists",
      });

    if (userId == targetId) {
      room.brodcasters.delete(targetId);
      room.broadcastersDetails = room.broadcastersDetails.filter(
        (broadcaster) => broadcaster._id.toString() !== targetId
      );

      io.to(roomId).emit(
        SocketChannels.broadcasterList,
        room.broadcastersDetails
      );
      return io.to(socket.id).emit(SocketChannels.removeBroadCaster, {
        roomId,
        message: "You have been removed from broadcasters",
      });
    }

    if (room.hostId != userId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.UNAUTHORIZED,
        message: "You are not host of this room",
      });
    if (!room.brodcasters.has(targetId))
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.NOT_FOUND,
        message: "User is not a broadcaster",
      });

    room.brodcasters.delete(targetId);

    room.broadcastersDetails = room.broadcastersDetails.filter(
      (broadcaster) => broadcaster._id.toString() !== targetId
    );

    const targetIdDetails = await userRepository.getUserDetailsSelectedField(
      targetId,
      ["name", "avatar", "uid", "country"]
    );
    const targetEquipedStoreItems = await getEquipedItemObjects(
      bucketRepository,
      categoryRepository,
      targetId
    );
    const message = {
      name: targetIdDetails.name as string,
      avatar: targetIdDetails.avatar as string,
      uid: targetIdDetails.uid as string,
      country: targetIdDetails.country as string,
      _id: targetIdDetails._id as string,
      text: `Has been removed from call`,
      equipedStoreItems: targetEquipedStoreItems,
    };
    io.to(roomId).emit(SocketChannels.sendMessage, message);
    const targetSocketId = onlineUsers.get(targetId);
    if (targetSocketId) {
      io.to(targetSocketId).emit(SocketChannels.removeBroadCaster, {
        roomId,
        message: "You have been removed from broadcasters",
      });
    }
    io.to(roomId).emit(
      SocketChannels.broadcasterList,
      room.broadcastersDetails
    );
  });

  // user only
  socket.on(SocketChannels.joinRoom, ({ roomId }) => {
    if (!roomId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Room ID is required",
      });
    const room = hostedRooms[roomId];
    if (!room)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.NOT_FOUND,
        message: "This room does not exists",
      });
    if (room.hostId == userId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Host cannot join their own room",
      });
    if (room.bannedUsers.has(userId))
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.UNAUTHORIZED,
        message: "You are banned from this room",
      });
    if (room.members.has(userId))
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.CONTINUE,
        message: "You are already in this room",
      });
    room.members.add(userId);
    room.membersDetails.push({
      name: userDetails.name as string,
      avatar: userDetails.avatar as string,
      uid: userDetails.uid as string,
      country: userDetails.country as string,
      _id: userDetails._id as string,
      equipedStoreItems: userObj.equipedStoreItems,
      currentBackground: userDetails.currentLevelBackground as string,
      currentLevel: userDetails.level as number,
      currentTag: userDetails.currentLevelTag as string,
    });
    socket.join(roomId);
    const message = {
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
    io.to(roomId).emit(SocketChannels.sendMessage, message);
    io.to(roomId).emit(SocketChannels.userJoined, userObj);
  });

  socket.on(SocketChannels.leaveRoom, ({ roomId }) => {
    if (!roomId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Room ID is required",
      });
    const room = hostedRooms[roomId];
    if (!room)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.NOT_FOUND,
        message: "This room does not exists",
      });

    if (room.hostId == userId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Host cannot leave the room, they can only close it",
      });

    if (!room.members.has(userId))
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.CONTINUE,
        message: "You are not in this room",
      });

    room.members.delete(userId);
    room.membersDetails = room.membersDetails.filter(
      (member) => member._id.toString() !== userId
    );
    if (room.brodcasters.has(userId)) room.brodcasters.delete(userId);
    room.broadcastersDetails = room.broadcastersDetails.filter(
      (broadcaster) => broadcaster._id.toString() !== userId
    );
    const objectToDelete = Array.from(room.callRequests).find(
      (request) => request._id.toString() === userId
    );
    if (objectToDelete) room.callRequests.delete(objectToDelete);

    socket.leave(roomId);
    const message = {
      name: userDetails.name as string,
      avatar: userDetails.avatar as string,
      uid: userDetails.uid as string,
      country: userDetails.country as string,
      _id: userDetails._id as string,
      text: `left the room`,
      equipedStoreItems: userObj.equipedStoreItems,
    };
    io.to(roomId).emit(SocketChannels.sendMessage, message);

    io.to(roomId).emit(SocketChannels.userLeft, userDetails);
  });

  socket.on(SocketChannels.getRooms, () => {
    const serializedRoom: ISerializedRoomData[] = [];

    for (const [room, roomData] of Object.entries(hostedRooms)) {
      const obj = {
        hostId: roomData.hostId,
        roomType: roomData.roomType,
        roomId: room,
        messages: roomData.messages,
        broadcastersDetails: roomData.broadcastersDetails,
        currentBackground: roomData.currentBackground,
        currentTag: roomData.currentTag,
        hostDetails: roomData.hostDetails,
        hostCoins: roomData.hostCoins,
        hostBonus: roomData.hostBonus,
        members: Array.from(roomData.members),
        membersDetails: roomData.membersDetails,
        bannedUsers: Array.from(roomData.bannedUsers),
        brodcasters: Array.from(roomData.brodcasters),
        adminDetails: roomData.adminDetails,
        callRequests: Array.from(roomData.callRequests),
        mutedUsers: Array.from(roomData.mutedUsers),
        title: roomData.title,
        duration: Math.floor(
          (new Date().getTime() - roomData.createdAt.getTime()) / 1000
        ),
      };
      if (!obj.bannedUsers.includes(userId)) {
        serializedRoom.push(obj);
      }
    }

    io.emit(SocketChannels.getRooms, serializedRoom);
  });

  // host only
  socket.on(SocketChannels.banUser, async ({ roomId, targetId }) => {
    if (!roomId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Room ID is required",
      });
    const room = hostedRooms[roomId];
    if (!room)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.NOT_FOUND,
        message: "This room does not exists",
      });
    if (room.hostId != userId && userId != room.adminDetails?._id.toString())
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.UNAUTHORIZED,
        message: "You are not host nor admin of this room",
      });
    if (room.hostId == targetId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Host cannot be banned",
      });
    if (!room.members.has(targetId))
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.NOT_FOUND,
        message: "User is not in this room",
      });
    if (room.bannedUsers.has(targetId))
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.CONTINUE,
        message: "User is already banned from this room",
      });

    room.bannedUsers.add(targetId);
    room.members.delete(targetId);
    room.membersDetails.filter((member) => member._id.toString() !== targetId);
    if (room.brodcasters.has(targetId)) room.brodcasters.delete(targetId);
    room.broadcastersDetails = room.broadcastersDetails.filter(
      (broadcaster) => broadcaster._id.toString() !== targetId
    );
    const objectToDelete = Array.from(room.callRequests).find(
      (request) => request._id.toString() === targetId
    );

    if (objectToDelete) room.callRequests.delete(objectToDelete);
    room.broadcastersDetails.filter(
      (broadcaster) => broadcaster._id.toString() !== targetId
    );

    const targetSocketId = onlineUsers.get(targetId);

    const targetIdDetails = await userRepository.getUserDetailsSelectedField(
      targetId,
      ["name", "avatar", "uid", "country"]
    );

    const targetEquipedStoreItems = await getEquipedItemObjects(
      bucketRepository,
      categoryRepository,
      targetId
    );

    const message = {
      name: targetIdDetails.name as string,
      avatar: targetIdDetails.avatar as string,
      uid: targetIdDetails.uid as string,
      country: targetIdDetails.country as string,
      _id: targetIdDetails._id as string,
      text: `Has been banned from this room`,
      equipedStoreItems: targetEquipedStoreItems,
    };

    io.to(roomId).emit(SocketChannels.sendMessage, message);

    io.to(roomId).emit(SocketChannels.banUser, {
      roomId,
      targetId,
      message: `${targetIdDetails.name} has been banned from this room`,
    });
    io.to(roomId).emit(SocketChannels.bannedList, Array.from(room.bannedUsers));

    if (targetSocketId) {
      io.sockets.sockets.get(targetSocketId)?.leave(roomId);
    }
  });

  socket.on(SocketChannels.bannedList, ({ roomId }) => {
    if (!roomId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Room ID is required",
      });
    const room = hostedRooms[roomId];
    if (!room)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.NOT_FOUND,
        message: "This room does not exists",
      });
    if (room.hostId != userId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.UNAUTHORIZED,
        message: "You are not host of this room",
      });
    io.to(socket.id).emit(
      SocketChannels.bannedList,
      Array.from(room.bannedUsers)
    );
  });

  socket.on(SocketChannels.updateHostBonus, ({ roomId, bonus }) => {
    if (!roomId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Room ID is required",
      });
    const room = hostedRooms[roomId];
    if (!room)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.NOT_FOUND,
        message: "This room does not exists",
      });
    if (room.hostId != userId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.UNAUTHORIZED,
        message: "You are not host of this room",
      });
    room.hostBonus += bonus;
    io.to(roomId).emit(SocketChannels.updateHostBonus, {
      roomId,
      hostBonus: room.hostBonus,
    });
  });

  socket.on(SocketChannels.updateHostCoins, ({ roomId, coins }) => {
    if (!roomId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Room ID is required",
      });
    const room = hostedRooms[roomId];
    if (!room)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.NOT_FOUND,
        message: "This room does not exists",
      });
    if (room.hostId != userId)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.UNAUTHORIZED,
        message: "You are not host of this room",
      });
    room.hostCoins += coins;
    io.to(roomId).emit(SocketChannels.updateHostCoins, {
      roomId,
      coins: room.hostCoins,
    });
  });

  socket.on(SocketChannels.inviteUser, ({ roomId, targetId }) => {});
}
