import { UpdateResult } from "mongoose";
import {
  StreamType,
  WhoCanTextMe,
  WithdrawAccountTypes,
} from "../../core/Utils/enums";
import { IUserEntity } from "../../entities/user_entity_interface";
import { IUserDocument } from "../../models/user/user_model_interface";
import { IUSerStatsDocument } from "../../entities/userstats/userstats_interface";
import { IWithdrawBonusDocument } from "../../models/room/withdraw_bonus_model";

export interface IGiftUser {
  myId: string;
  coins: number;
  diamonds: number;
  userId: string;
}

export interface IAuthService {
  registerWithGoogle(
    UserData: IUserEntity
  ): Promise<{ user: IUserDocument; token: string }>;
  retrieveMyDetails(id: string): Promise<IUserDocument | null>;
  deleteMyAccount(id: string): Promise<IUserDocument | null>;
  retrieveUserDetails(id: string, myId: string): Promise<IUserDocument | null>;
  updateProfile({
    id,
    profileData,
    avatar,
    coverPicture
  }: {
    id: string;
    profileData: Partial<Record<string, any>>;
    avatar?: Express.Multer.File;
    coverPicture?: Express.Multer.File;
  }): Promise<IUserDocument | null>;
  giftUser({
    targetUserIds,
    myId,
    roomId,
    giftId,
    qty,
  }: {
    targetUserIds: string[];
    myId: string;
    roomId: string;
    giftId: string;
    qty: number;
  }): Promise<UpdateResult>;
  generateToken(info: {
    channelName: string;
    uid: string;
    APP_CERTIFICATE?: string;
    APP_ID?: string;
  }): Promise<{ token: string }>;
  getDailyBonus(
    id: string,
    totalTime: number,
    type: StreamType
  ): Promise<IUSerStatsDocument>;
  setChatPrivacy(payload: {
    id: string;
    whoCanTextMe: WhoCanTextMe;
    highLevelRequirements: { levelType: string; level: number }[];
  }): Promise<IUserDocument | null>;

  withdrawBonus(data: {
    hostId: string;
    accountType: WithdrawAccountTypes;
    accountNumber: string;
    totalSalary: number;
  }): Promise<IWithdrawBonusDocument>;
}
