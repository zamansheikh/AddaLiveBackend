import { Server, Socket } from "socket.io";
import { IAudioRoomData, IMemberDetails } from "../interface/socket_interface";
import { ActivityZoneState, SocketChannels } from "../../Utils/enums";
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
import { IUserDocument } from "../../../models/user/user_model_interface";
import { StoryReactionDto } from "../../../dtos/stories/story_react_dto";

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

  ensureUserIsNotBlocked(details: IUserDocument): boolean {
    if (
      details.activityZone &&
      details.activityZone.zone === ActivityZoneState.permanentBlock
    ) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "You are permanently blocked from this platform",
      });
      return false;
    }

    if (
      details.activityZone &&
      details.activityZone.zone === ActivityZoneState.temporaryBlock &&
      details.activityZone.expire!.toISOString() > new Date().toISOString()
    ) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: `You are temporarily blocked from this platform until ${details.activityZone.expire?.toLocaleString()}`,
      });
      return false;
    }
    return true;
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

  ensureUserCanJoin(roomId: string, userId: string, password: string): boolean {
    const ensureRoomExists = this.ensureRoomExists(roomId);
    if (ensureRoomExists == false) return false;

    const room = this.hostestRooms[roomId];
    // if (room.members.has(userId)) {
    //   socketResponse(this.io, SocketChannels.error, this.socket.id, {
    //     success: false,
    //     message: "You are already in this room",
    //   });
    //   return false;
    // }

    if(room.hostId == userId) return true;

    if (room.bannedUsers.has(userId)) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "you are banned from this room",
      });
      return false;
    }

    if (room.isLocked && room.password != password) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "wrong password, this room is locked",
      });
      return false;
    }

    return true;
  }

  ensureRightSeatType(seatKey: string): boolean {
    if (seatKey == undefined || seatKey == null || seatKey == "" || !seatKey) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "seatKey is required",
      });
      return false;
    }
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
    const ensureRightSeatType = this.ensureRightSeatType(seatKey);
    if (ensureRightSeatType == false) return false;
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

  ensureUserIsNotOnAnySeat(roomId: string, userId: string): boolean {
    const room = this.hostestRooms[roomId];
    if (
      !isEmptyObject(room.premiumSeat.member) &&
      (room.premiumSeat.member as IMemberDetails)._id == userId
    ) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "You are already on the premium seat",
      });
      return false;
    }
    for (const [seatKey, seat] of Object.entries(room.seats)) {
      if (
        !isEmptyObject(seat.member) &&
        (seat.member as IMemberDetails)._id == userId
      ) {
        socketResponse(this.io, SocketChannels.error, this.socket.id, {
          success: false,
          message: `You are already on ${seatKey}`,
        });
        return false;
      }
    }
    return true;
  }

  async ensureJoinSeat(
    roomId: string,
    userId: string,
    seatKey: string
  ): Promise<boolean> {
    const ensureRoomExists = this.ensureRoomExists(roomId);
    if (ensureRoomExists == false) return false;
    const room = this.hostestRooms[roomId];
    if (!room.members.has(userId)) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "You are not a member of this room",
      });
      return false;
    }
    const ensureSeatAvailable = this.ensureSeatAvailable(roomId, seatKey);
    // const ensureUserIsNotOnAnySeat = this.ensureUserIsNotOnAnySeat(
    //   roomId,
    //   userId
    // );
    if (ensureSeatAvailable == false) return false;
    // if (ensureUserIsNotOnAnySeat == false) return false;
    if (seatKey === "premiumSeat") {
      return await this.ensurePremiumUser(
        userId,
        new MyBucketRepository(MyBucketModel)
      );
    }
    return true;
  }

  ensureLeaveSeat(roomId: string, userId: string, seatKey: string): boolean {
    const ensureRoomExists = this.ensureRoomExists(roomId);
    if (ensureRoomExists == false) return false;
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
    const ensureRoomExists = this.ensureRoomExists(roomId);
    if (ensureRoomExists == false) return false;
    const room = this.hostestRooms[roomId];
    const hostId = room.hostDetails?._id;
    const adminId = room.adminDetails?._id;
    const isHost = userId.toString() === hostId?.toString();
    const isAdmin = adminId && userId.toString() === adminId.toString();
    if (!isHost && !isAdmin) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "You are not authorized to perform this action",
      });
      return false;
    }
    return true;
  }

  ensureHasMember(roomId: string, userId: string): boolean {
    const ensureRoomExists = this.ensureRoomExists(roomId);
    if (ensureRoomExists == false) return false;
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
    const ensureRoomExists = this.ensureRoomExists(roomId);
    if (ensureRoomExists == false) return false;
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

    if (room.hostDetails?._id == userId) isOnSeat = true;

    if (!isOnSeat) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "user is not on any seat",
      });
      return false;
    }
    return true;
  }

  ensureCanMakeAdmin(
    roomId: string,
    userId: string,
    targetId: string
  ): boolean {
    const isHost = this.ensureIsHost(roomId, userId);
    if (isHost == false) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "Only the host can make someone admin",
      });
      return false;
    }
    const ensureHasMember = this.ensureHasMember(roomId, targetId);
    if (ensureHasMember == false) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "Target user is not in this room",
      });
      return false;
    }
    const room = this.hostestRooms[roomId];
    if (room.adminDetails) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "you can only have one admin",
      });
      return false;
    }
    if (room.hostDetails?._id == targetId) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "Host cannot be made admin",
      });
      return false;
    }
    return true;
  }

  ensureCanRemoveAdmin(roomId: string, userId: string): boolean {
    const isHost = this.ensureIsHost(roomId, userId);
    if (isHost == false) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "Only the host can remove an admin",
      });
      return false;
    }
    const room = this.hostestRooms[roomId];
    if (!room.adminDetails) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "There is no admin to remove",
      });
      return false;
    }
    return true;
  }

  ensureRightChatPrivacyType(privacyType: any): boolean {
    if (
      privacyType == undefined ||
      privacyType == null ||
      privacyType == "" ||
      !privacyType
    ) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "privacyType is required",
      });
      return false;
    }

    if (
      privacyType != "any" &&
      privacyType != "none" &&
      !Array.isArray(privacyType)
    ) {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "Invalid privacyType",
      });
      return false;
    }
    if (Array.isArray(privacyType)) {
      for (let i = 0; i < privacyType.length; i++) {
        // check if its an array of mongoose object id
        if (!privacyType[i].match(/^[0-9a-fA-F]{24}$/)) {
          socketResponse(this.io, SocketChannels.error, this.socket.id, {
            success: false,
            message: "Invalid privacyType array, must contain valid user IDs",
          });
          return false;
        }
      }
    }
    return true;
  }

  enureCanSendMessage(roomId: string, userId: string): boolean {
    const roomExistance = this.ensureRoomExists(roomId);
    const hasMember = this.ensureHasMember(roomId, userId);
    if (roomExistance == false) return false;
    if (hasMember == false) return false;
    const room = this.hostestRooms[roomId];
    if (room.chatPrivacy == "none") {
      socketResponse(this.io, SocketChannels.error, this.socket.id, {
        success: false,
        message: "Chat is disabled in this room",
      });
      return false;
    }
    if (Array.isArray(room.chatPrivacy)) {
      if (!room.chatPrivacy.includes(userId)) {
        socketResponse(this.io, SocketChannels.error, this.socket.id, {
          success: false,
          message: "You are not allowed to chat in this room",
        });
        return false;
      }
    }
    return true;
  }
}
