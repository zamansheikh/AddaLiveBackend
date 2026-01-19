import mongoose from "mongoose";
import { Socket } from "socket.io";
import { LaunchGiftTypes, RoomTypes } from "../../Utils/enums";
import { IUserDocument } from "../../../models/user/user_model_interface";

export interface ISocketHandler {
  register(socket: Socket): void;
}

export interface IMemberDetails {
  name: string;
  avatar: string;
  uid: string;
  userId: number;
  country: string;
  currentBackground: string;
  currentTag: string;
  currentLevel: number;
  _id: mongoose.Schema.Types.ObjectId | string;
  equipedStoreItems: Record<string, string>;
  totalGiftSent: number;
  isMuted?: boolean;
}

export interface RoomData {
  hostId: string;
  roomType: RoomTypes;
  hostDetails?: IMemberDetails | null;
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
  userId: number;
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
  roomId: string;
  currentRocketLevel: number; // eg: level 1 to level 5
  currentRocketFuel: number; // eg : 5,00,000 - fromt gift coins
  currentRocketMilestone: number; // eg: 10,00,000 - constant set according to business logic
  adminDetails: string[];
  hostDetails?: IMemberDetails;
  hostGifts: number; // host sent amount (used for ranking)
  hostBonus: number;  // host recieved amount (used to display the gifts)
  roomTotalTransaction: number; // total amount exchanged in the room
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
  uniqueUsers: Set<string>; // to track the unique users _id in the room
  roomLevel: number; // to track the room level (used for room support reward)
  roomPartners: IMemberDetails[]; // to track the room partners (used for room support reward)
}


export interface ISearializedAudioRoom {
  title: string;
  numberOfSeats: number;
  announcement: string;
  roomId: string;
  currentRocketLevel: number; // eg: level 1 to level 5
  currentRocketFuel: number; // eg : 5,00,000 - fromt gift coins
  currentRocketMilestone: number; // eg: 10,00,000 - constant set according to business logic
  rocketFuelPercentage: number; // eg : 0.78 - range (0-1) - calculated from currentRocketFuel / currentRocketMilestone
  hostGifts: number;
  hostBonus: number;
  roomTotalTransaction: number; // total amount exchanged in the room
  hostDetails?: IMemberDetails;
  adminDetails: string[];
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
  roomLevel: number;
  roomPartners: IMemberDetails[];
}


export interface ILaunchGifts {
  type: LaunchGiftTypes;
  thumbnail: string;
  quantity: number;
}

export interface IRewarededUser extends IMemberDetails {
  gifts: ILaunchGifts[];
}

export interface ILaunchRocketInfo {
  roomId: string,
  currentIterationIdx: number; // current milestone to launch the rocket
  currentDay: Date; // to keep track of the day (since each day it gets reset)
  cooldownTill: Date; 
}

export interface IRoomXPData {
  firstEntry: boolean;
  ownRoomXP: number;
  othersRoomXp: number;
}

export interface IRoomSupportHistory {
  roomLevel: number;
  roomVisitors: number;
  roomTransactions: number;
  rewardCoin: number;
}