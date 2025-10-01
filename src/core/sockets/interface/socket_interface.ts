import mongoose from "mongoose";
import { Socket } from "socket.io";
import { RoomTypes } from "../../Utils/enums";
import { IUserDocument } from "../../../models/user/user_model_interface";

export interface ISocketHandler {
  register(socket: Socket): void;
}

export interface IMemberDetails {
  name: string;
  avatar: string;
  uid: string;
  country: string;
  currentBackground: string;
  currentTag: string;
  currentLevel: number;
  _id: mongoose.Schema.Types.ObjectId | string;
  equipedStoreItems: Record<string, string>;
  totalGiftSent?: number;
  isMuted?: boolean;
}

export interface RoomData {
  hostId: string;
  roomType: RoomTypes;
  hostDetails?: IUserDocument | null;
  hostCoins: number;
  hostBonus: number;
  members: Set<string>;
  membersDetails: IMemberDetails[];
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
  bannedUsers: Set<string>;
  brodcasters: Set<string>;
  adminDetails: IMemberDetails | null;
  callRequests: Set<IMemberDetails>;
  mutedUsers: Set<string>;
  ranking: IMemberDetails[];
  title: string;
  createdAt: Date;
}

export interface IRoomMessage {
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
}

export interface IAudioSeats {
  member: IMemberDetails | {};
  available: boolean;
}



export interface IAudioRoomData {
  title: string;
  numberOfSeats: number;
  roomId: string;
  hostGifts: number;
  hostBonus: number;
  hostDetails?: IMemberDetails;
  premiumSeat: IAudioSeats;
  seats: Record<string, IAudioSeats>;
  messages: IRoomMessage[];
  createdAt: Date;
  members: Set<string>;
  membersDetails: IMemberDetails[];
  bannedUsers: Set<string>;
  mutedUsers: Set<string>;
  ranking: IMemberDetails[];
}


export interface ISearializedAudioRoom {
  title: string;
  numberOfSeats: number;
  roomId: string;
  hostGifts: number;
  hostBonus: number;
  hostDetails?: IMemberDetails;
  premiumSeat: IAudioSeats;
  seats: Record<`seat-${number}`, IAudioSeats>;
  messages: IRoomMessage[];
  createdAt: Date;
  members: string[];
  membersDetails: IMemberDetails[];
  bannedUsers: string[];
  mutedUsers: string[];
  ranking: IMemberDetails[];
  duration: number;
}