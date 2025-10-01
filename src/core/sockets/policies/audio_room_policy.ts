import { Server, Socket } from "socket.io";
import { IAudioRoomData, IMemberDetails } from "../interface/socket_interface";
import { SocketChannels } from "../../Utils/enums";
import { StatusCodes } from "http-status-codes";
import {
  checkPremiumItem,
  isEmptyObject,
  socketResponse,
} from "../../Utils/helper_functions";
import MyBucketRepository, {
  IMyBucketRepository,
} from "../../../repository/store/my_bucket_repository";
import MyBucketModel from "../../../models/store/my_bucket_model";

export class AudioRoomPolicy {
  hostestRooms: Record<string, IAudioRoomData>;
  socket: Socket;
  io: Server;
  constructor(
    hostedRooms: Record<string, IAudioRoomData>,
    io: Server,
    socket: Socket
  ) {
    this.io = io;
    this.socket = socket;
    this.hostestRooms = hostedRooms;
  }

  ensureCreateRoomPolicy(
    roomId: string,
    title: string,
    numberOfSeats: any
  ): boolean {
    if (!roomId || !title || !numberOfSeats) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "roomId, title and numberOfSeats are required",
      });
      return false;
    }
    if (isNaN(Number(numberOfSeats))) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "numberOfSeats must be a number",
      });
      return false;
    }
    numberOfSeats = Number(numberOfSeats);
    if (numberOfSeats !== 6 && numberOfSeats !== 8 && numberOfSeats !== 12) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "numberOfSeats must be 6, 8 or 12",
      });
      return false;
    }
    if (this.hostestRooms[roomId]) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "Room Already Exists",
      });
      return false;
    }
    return true;
  }

  ensureRoomExists(roomId: string): boolean {
    if (!roomId) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "Room ID is required",
      });
      return false;
    }
    if (!this.hostestRooms[roomId]) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "This room does not exist",
      });
      return false;
    }
    return true;
  }

  ensureUserCanJoin(roomId: string, userId: string): boolean {
    if (!this.ensureRoomExists(roomId)) return false;

    const room = this.hostestRooms[roomId];
    if (room.members.has(userId)) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "You are already in this room",
      });
      return false;
    }

    if (room.bannedUsers.has(userId)) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "you are banned from this room",
      });
      return false;
    }

    return true;
  }

  ensureRightSeatType(seatKey: string): boolean {
    if (seatKey != "premiumSeat" && !seatKey.startsWith("seat-")) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "Invalid seat key",
      });
      return false;
    }
    return true;
  }

  ensureSeatAvailable(roomId: string, seatKey: string): boolean {
    if (!this.ensureRightSeatType(seatKey)) return false;
    const seatNumber = seatKey.split("-")[1];
    const room = this.hostestRooms[roomId];
    if (room.numberOfSeats < Number(seatNumber)) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "Invalid seat number",
      });
      return false;
    }

    if (seatKey === "premiumSeat") {
      if (
        !room.premiumSeat.available ||
        !isEmptyObject(room.premiumSeat.member)
      ) {
        socketResponse(this.io, SocketChannels.error, this.socket.id, {
          success: false,
          message: "Premium seat is not available",
        });
        return false;
      }
    } else {
      if (
        !room.seats[seatKey].available ||
        !isEmptyObject(room.seats[seatKey].member)
      ) {
        socketResponse(this.io, SocketChannels.error, this.socket.id, {
          success: false,
          message: `${seatKey} is not available`,
        });

        return false;
      }
    }
    return true;
  }

  async ensurePremiumUser(
    userId: string,
    bucketRepo: IMyBucketRepository
  ): Promise<boolean> {
    if (!userId) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "User ID is required",
      });

      return false;
    }
    const hasPremiumItem = await checkPremiumItem(bucketRepo, userId);
    if (!hasPremiumItem) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "You don't have a premium item to join this seat",
      });
      return false;
    }
    return true;
  }

  async ensureJoinSeat(
    roomId: string,
    userId: string,
    seatKey: string
  ): Promise<boolean> {
    if (!this.ensureRoomExists(roomId)) return false;
    const room = this.hostestRooms[roomId];
    if (!room.members.has(userId)) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "You are not a member of this room",
      });
      return false;
    }
    if (!this.ensureSeatAvailable(roomId, seatKey)) return false;
    if (seatKey === "premiumSeat") {
      return await this.ensurePremiumUser(
        userId,
        new MyBucketRepository(MyBucketModel)
      );
    }
    return true;
  }

  ensureLeaveSeat(roomId: string, userId: string, seatKey: string): boolean {
    if (!this.ensureRoomExists(roomId)) return false;
    const room = this.hostestRooms[roomId];
    if (!room.members.has(userId)) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "You are not a member of this room",
      });
      return false;
    }
    if (seatKey === "premiumSeat") {
      if (isEmptyObject(room.premiumSeat.member)) {
        socketResponse(this.io, SocketChannels.error, this.socket.id, {
          success: false,
          message: "Premium seat is already empty",
        });
        return false;
      }
      if ((room.premiumSeat.member as IMemberDetails)._id != userId) {
        socketResponse(this.io, SocketChannels.error, this.socket.id, {
          success: false,
          message: "You are not on this seat",
        });
        return false;
      }
    } else {
      if (isEmptyObject(room.seats[seatKey].member)) {
        socketResponse(this.io, SocketChannels.error, this.socket.id, {
          success: false,
          message: `${seatKey} is already empty`,
        });
        return false;
      }
      if ((room.seats[seatKey].member as IMemberDetails)._id != userId) {
        socketResponse(this.io, SocketChannels.error, this.socket.id, {
          success: false,
          message: "You are not on this seat",
        });
        return false;
      }
    }
    return true;
  }

  ensureIsHost(roomId: string, userId: string): boolean {
    if (!this.ensureRoomExists(roomId)) return false;
    const room = this.hostestRooms[roomId];
    if (room.hostDetails?._id != userId) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "You are not the host of this room",
      });
      return false;
    }
    return true;
  }

  ensureHasMember(roomId: string, userId: string): boolean {
    if (!this.ensureRoomExists(roomId)) return false;
    const room = this.hostestRooms[roomId];
    if (!room.members.has(userId)) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "User is not in this room",
      });
      return false;
    }
    return true;
  }

  ensureIsOnSeat(roomId: string, userId: string): boolean {
    if (!this.ensureRoomExists(roomId)) return false;
    const room = this.hostestRooms[roomId];
    let isOnSeat = false;
    if (
      !isEmptyObject(room.premiumSeat.member) &&
      (room.premiumSeat.member as IMemberDetails)._id == userId
    ) {
      isOnSeat = true;
    }
    for (const [seatKey, seat] of Object.entries(room.seats)) {
      if (
        !isEmptyObject(seat.member) &&
        (seat.member as IMemberDetails)._id == userId
      )
        isOnSeat = true;
    }
    if (!isOnSeat) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "user is not on any seat",
      });
      return false;
    }
    return true;
  }
}
