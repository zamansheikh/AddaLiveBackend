import { Socket, Server } from "socket.io";
import { RoomTypes, SocketChannels } from "../../Utils/enums";
import { StatusCodes } from "http-status-codes";
import { RoomData } from "../socket_server";
import AppError from "../../errors/app_errors";
import { IUserDocument } from "../../../models/user/user_model_interface";
import { IUserRepository } from "../../../repository/user_repository";

export interface ISerializedRoomData {
  hostId: string;
  roomType: RoomTypes;
  hostDetails?: IUserDocument | null;
  members: string[];
  bannedUsers: string[];
  brodcasters: string[];
  callRequests: string[];
  title: string;
}

export async function registerGroupRoomHandler(
  io: Server,
  socket: Socket,
  onlineUsers: Map<string, string>,
  hostedRooms: Record<string, RoomData>,
  userRepository: IUserRepository
) {
  const userId = socket.handshake.query.userId as string;
  const userDetails = await userRepository.getUserDetailsSelectedField(userId, [
    "name",
    "avatar",
    "uid",
    "country",
  ]);
  if (!userId) throw new AppError(StatusCodes.NOT_FOUND, "User not found");

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
      members: new Set([userId]),
      bannedUsers: new Set(),
      brodcasters: new Set([userId]),
      callRequests: new Set(),
      title: title,
    };
    socket.join(roomId);

    const serializedRoom: ISerializedRoomData[] = [];

    for (const [room, roomData] of Object.entries(hostedRooms)) {
      const obj = {
        hostId: roomData.hostId,
        roomType: roomData.roomType,
        roomId: room,
        hostDetails: roomData.hostDetails,
        members: Array.from(roomData.members),
        bannedUsers: Array.from(roomData.bannedUsers),
        brodcasters: Array.from(roomData.brodcasters),
        callRequests: Array.from(roomData.callRequests),
        title: roomData.title,
      };
      serializedRoom.push(obj);
    }

    io.emit(SocketChannels.getRooms, serializedRoom);

    // ! if unintended users are also getting the event, use io.to(roomId),
    // io.to(roomId).emit(SocketChannels.roomList, Object.keys(hostedRooms));
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
    io.to(roomId).emit(SocketChannels.roomList, Object.keys(hostedRooms));
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
    if (room.callRequests.has(userId))
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.CONTINUE,
        message: "You have already sent request to join the call",
      });

    room.callRequests.add(userId);
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

  socket.on(SocketChannels.acceptCallReq, ({ roomId, targetId }) => {
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
    if (!room.callRequests.has(targetId))
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
    if (room.brodcasters.size >= 3)
      return io.to(socket.id).emit(SocketChannels.error, {
        status: StatusCodes.BAD_REQUEST,
        message: "Maximum 3 broadcasters are allowed",
      });
    room.callRequests.delete(targetId);
    room.brodcasters.add(targetId);

    const targetSocketId = onlineUsers.get(targetId);
    if (targetSocketId) {
      io.to(targetSocketId).emit(SocketChannels.acceptCallReq, {
        roomId,
        message: "Your call request has been accepted",
      });
    }
    io.to(roomId).emit(
      SocketChannels.broadcasterList,
      Array.from(room.brodcasters)
    );
    // io.to(roomId).emit(
    //   SocketChannels.joinCallReqList,
    //   Array.from(room.callRequests)
    // );
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
      Array.from(room.brodcasters)
    );
  });

  socket.on(SocketChannels.removeBroadCaster, ({ roomId, targetId }) => {
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
      io.to(roomId).emit(
        SocketChannels.broadcasterList,
        Array.from(room.brodcasters)
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
    const targetSocketId = onlineUsers.get(targetId);
    if (targetSocketId) {
      io.to(targetSocketId).emit(SocketChannels.removeBroadCaster, {
        roomId,
        message: "You have been removed from broadcasters",
      });
    }
    io.to(roomId).emit(
      SocketChannels.broadcasterList,
      Array.from(room.brodcasters)
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
    socket.join(roomId);
    io.to(roomId).emit(SocketChannels.userJoined, userDetails);
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
    if (room.brodcasters.has(userId)) room.brodcasters.delete(userId);
    if (room.callRequests.has(userId)) room.callRequests.delete(userId);

    socket.leave(roomId);

    io.to(roomId).emit(SocketChannels.userLeft, userDetails);
  });

  socket.on(SocketChannels.getRooms, () => {
    const serializedRoom: ISerializedRoomData[] = [];

    for (const [room, roomData] of Object.entries(hostedRooms)) {
      const obj = {
        hostId: roomData.hostId,
        roomType: roomData.roomType,
        roomId: room,
        hostDetails: roomData.hostDetails,
        members: Array.from(roomData.members),
        bannedUsers: Array.from(roomData.bannedUsers),
        brodcasters: Array.from(roomData.brodcasters),
        callRequests: Array.from(roomData.callRequests),
        title: roomData.title,
      };
      serializedRoom.push(obj);
    }

    io.emit(SocketChannels.getRooms, serializedRoom);
  });

  // host only
  socket.on(SocketChannels.banUser, ({ roomId, targetId }) => {});

  socket.on(SocketChannels.inviteUser, ({ roomId, targetId }) => {});
}
