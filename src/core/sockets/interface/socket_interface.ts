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
  announcement: string; 
  currentRocketMilestone: number; // fuel needed to fire the rocket
  currentRocketFuel: number; // current fuel level
  roomId: string;
  adminDetails?: IMemberDetails;
  hostDetails?: IMemberDetails;
  hostGifts: number; // host sent amount (used for ranking)
  hostBonus: number;  // host recieved amount (used to display the gifts)
  premiumSeat: IAudioSeats;
  seats: Record<string, IAudioSeats>;
  messages: IRoomMessage[];
  createdAt: Date;
  members: Set<string>;
  membersDetails: IMemberDetails[];
  bannedUsers: Set<string>;
  mutedUsers: Set<string>;
  ranking: IMemberDetails[];
  chatPrivacy: string | string[];
  password?: string; // for room entry 
  isHostPresent: boolean, // to check if the host is present in the room
  isLocked: boolean; // private or public 
  hostId: string; // to track the host
}


export interface ISearializedAudioRoom {
  title: string;
  numberOfSeats: number;
  announcement: string;
  currentRocketMilestone: number;
  currentRocketFuel: number;
  fuelPercentage: number;
  roomId: string;
  hostGifts: number;
  hostBonus: number;
  hostDetails?: IMemberDetails;
  adminDetails?: IMemberDetails;
  premiumSeat: IAudioSeats;
  seats: Record<`seat-${number}`, IAudioSeats>;
  messages: IRoomMessage[];
  createdAt: Date;
  members: string[];
  membersDetails: IMemberDetails[];
  bannedUsers: string[];
  mutedUsers: string[];
  ranking: IMemberDetails[];
  chatPrivacy: string | string[];
  isHostPresent: boolean;
  duration: number;
  isLocked: boolean;
}


export interface ILaunchRocketInfo {
  roomId: string,
  currentIterationIdx: number; // current milestone to launch the rocket
  currentDay: Date; // to keep track of the day (since each day it gets reset)
  cooldownTill: Date; 
}