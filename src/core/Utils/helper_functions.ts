import crypto from "crypto";
import AppError from "../errors/app_errors";
import { StatusCodes } from "http-status-codes";
import {
  ActivityZoneState,
  AdminPowers,
  AudioSeatTypes,
  StatusTypes,
  UserRoles,
  WithdrawAccountTypes,
} from "./enums";
import { IUserDocument } from "../../models/user/user_model_interface";
import { IAdminDocument } from "../../entities/admin/admin_interface";
import { IPortalUserDocument } from "../../entities/portal_users/portal_user_interface";
import { appendFile, stat } from "fs";
import { IMyBucketRepository } from "../../repository/store/my_bucket_repository";
import { Types } from "mongoose";
import { IStoreItem } from "../../models/store/store_item_model";
import { IStoreCategoryRepository } from "../../repository/store/store_category_repository";
import { userLevels } from "./constants";
import { Server } from "socket.io";
import {
  IAudioRoomData,
  IMemberDetails,
  ISearializedAudioRoom,
} from "../sockets/interface/socket_interface";

export const generateFileHash = (buffer: Buffer): string => {
  return crypto.createHash("sha256").update(buffer).digest("hex");
};

export function isVideoFile(filename: string): boolean {
  const videoExtensions = [
    ".mp4",
    ".mov",
    ".avi",
    ".wmv",
    ".flv",
    ".mkv",
    ".webm",
    ".mpeg",
    ".mp3",
    ".wav",
    ".ogg",
    ".aac",
    ".flac",
  ];
  const ext = filename.toLowerCase().split(".").pop();
  return ext ? videoExtensions.includes(`.${ext}`) : false;
}

export function validatePromoteUserPermission(permissions: string[]): void {
  validatePermissions(permissions);
}

export function canUserUpdate(
  myProfile: IUserDocument | IAdminDocument | IPortalUserDocument,
  requiredPermissions: AdminPowers[]
): boolean {
  if (myProfile.userRole == UserRoles.Admin) {
    return true;
  }

  const hasPermission = (myProfile as IUserDocument).userPermissions.filter(
    (p) => requiredPermissions.includes(p as AdminPowers)
  );

  if (hasPermission.length == requiredPermissions.length) return true;

  if (myProfile.userRole == UserRoles.User) return false;
  return false;
}

export function validateCreatePortalUserData(
  body: Record<string, unknown>
): void {
  const { name, userId, password, designation, userPermissions, userRole } =
    body;
  if (
    !name ||
    !userId ||
    !password ||
    !designation ||
    !userPermissions ||
    !userRole
  )
    throw new AppError(StatusCodes.BAD_REQUEST, "All fields are required");
  if (!Object.values(UserRoles).includes(userRole as UserRoles))
    throw new AppError(StatusCodes.BAD_REQUEST, "Invalid user role");
  if (
    userRole == UserRoles.Admin ||
    userRole == UserRoles.User ||
    userRole == UserRoles.Host
  )
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `Admin cannot create -> ${userRole}`
    );
  validatePermissions(userPermissions);
}

export function validatePermissions(permissions: any) {
  if (!permissions)
    throw new AppError(StatusCodes.BAD_REQUEST, "permissions are required");
  if (!Array.isArray(permissions))
    throw new AppError(StatusCodes.BAD_REQUEST, "permissions must be an array");
  if (permissions.length === 0)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "permissions array must contain at least one permission"
    );
  const invalidatePermissions = permissions.filter(
    (p: any) => !Object.values(AdminPowers).includes(p as AdminPowers)
  );
  if (invalidatePermissions.length > 0)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `Invalid permissions: ${invalidatePermissions.join(", ")}`
    );
}

export function validateblockUser(body: any): void {
  const { targetId, zone, date_till } = body;
  if (!targetId || !zone)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Target ID and activity zone are required"
    );
  if (!Object.values(ActivityZoneState).includes(zone))
    throw new AppError(StatusCodes.BAD_REQUEST, "Invalid activity zone");
  if (zone === ActivityZoneState.temporaryBlock && !date_till)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "dateTill is required for temporary block"
    );
}

export function validateWithdrawBonus(body: Record<string, unknown>) {
  const { accountType, accountNumber, totalSalary } = body;
  if (!accountType || !accountNumber || !totalSalary)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Host ID, account type, account number, and total salary are required"
    );
  if (
    !Object.values(WithdrawAccountTypes).includes(
      accountType as WithdrawAccountTypes
    )
  )
    throw new AppError(StatusCodes.BAD_REQUEST, "Invalid account type");
  // check if host id is a valid mongodbId
  if (isNaN(Number(totalSalary)))
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Total salary must be a number"
    );
}

export function getWithdrawDateBoundaires(): { gte: Date; lte: Date } {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed
  const date = today.getDate();
  const lastDate = new Date(year, month + 1, 0).getDate();

  if (date <= 15) {
    return {
      gte: new Date(year, month, 1, 0, 0, 0),
      lte: new Date(year, month, date, 23, 59, 59),
    };
  } else if (date > 15 && date <= lastDate) {
    return {
      gte: new Date(year, month, 15, 0, 0, 0),
      lte: new Date(year, month, date, 23, 59, 59),
    };
  } else
    throw new AppError(StatusCodes.BAD_REQUEST, "today is not salary date");
}

export function getNextSalaryDate(): Date {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed
  const date = today.getDate();
  const lastDate = new Date(year, month + 1, 0).getDate();
  if (date <= 15) {
    return new Date(year, month, 15, 23, 59, 59);
  } else if (date > 15 && date <= lastDate) {
    return new Date(year, month, lastDate, 23, 59, 59);
  } else
    throw new AppError(StatusCodes.BAD_REQUEST, "today is not salary date");
}

export function getPercentageFromHostCount(hostCount: number) {
  if (hostCount >= 5 && hostCount < 10) return 0.1;
  else if (hostCount >= 10 && hostCount < 20) return 0.12;
  else if (hostCount >= 20 && hostCount < 30) return 0.15;
  else if (hostCount >= 30) return 0.17;
  else return 0;
}

export function validateStatus(status: any) {
  if (!status)
    throw new AppError(StatusCodes.BAD_REQUEST, "Status is required");
  if (!Object.values(StatusTypes).includes(status))
    throw new AppError(StatusCodes.BAD_REQUEST, `Invalid status: ${status}`);
}

export function validateFieldExistance(filed: any, fieldName: string) {
  if (!filed)
    throw new AppError(StatusCodes.BAD_REQUEST, `${fieldName} is required`);
}

export async function getEquipedItemObjects(
  repository: IMyBucketRepository,
  catRepository: IStoreCategoryRepository,
  userId: string
): Promise<Record<string, any>> {
  const equipedBuccket = await repository.getEquipedBuckets(userId);
  let equipedFeatures: Record<string, any> = {};
  for (let i = 0; i < equipedBuccket.length; i++) {
    if (
      typeof equipedBuccket[i].itemId == "string" ||
      equipedBuccket[i].itemId instanceof Types.ObjectId
    )
      throw new AppError(StatusCodes.CONFLICT, "itemId is not populated");
    const item = equipedBuccket[i].itemId as IStoreItem;
    if (item.bundleFiles && item.bundleFiles.length > 0) {
      for (let j = 0; j < item.bundleFiles.length; j++) {
        equipedFeatures[item.bundleFiles[j].categoryName] =
          item.bundleFiles[j].svgaFile;
      }
    } else {
      const category = await catRepository.getCategoryById(
        item.categoryId as string
      );
      if (!category)
        throw new AppError(StatusCodes.NOT_FOUND, "category not found");
      equipedFeatures[category.title] = item.svgaFile;
    }
  }
  return equipedFeatures;
}

export async function checkPremiumItem(
  repository: IMyBucketRepository,
  userId: string
): Promise<boolean> {
  const equipedBuccket = await repository.getEquipedBuckets(userId);

  if (equipedBuccket.length != 1) return false;

  if (
    typeof equipedBuccket[0].itemId == "string" ||
    equipedBuccket[0].itemId instanceof Types.ObjectId
  )
    throw new AppError(StatusCodes.CONFLICT, "itemId is not populated");
  const item = equipedBuccket[0].itemId as IStoreItem;
  if (item.isPremium && item.name == "SVIP") return true;
  return false;
}

export function determineUserLevel(coins: number): number {
  for (let i = 0; i < userLevels.length; i++) {
    if (coins < userLevels[i]) {
      return i; // Levels start from 0
    }
  }
  return 40; // at maximum level
}

export function determineUserTagAndBg(level: number): string {
  if (level >= 1 && level <= 5) return "1-5";
  else if (level >= 6 && level <= 10) return "6-10";
  else if (level >= 11 && level <= 15) return "11-15";
  else if (level >= 16 && level <= 20) return "16-20";
  else if (level >= 21 && level <= 25) return "21-25";
  else if (level >= 26 && level <= 30) return "26-30";
  else if (level >= 31 && level <= 35) return "31-35";
  else if (level >= 36 && level <= 40) return "36-40";
  return "36-40";
}

export function getCloudinaryPublicId(url: string): string {
  const parts = new URL(url).pathname.split("/");
  const fileName = parts[parts.length - 1];
  const folderName = parts[parts.length - 2];
  const fileHash = fileName.substring(0, fileName.lastIndexOf("."));
  const publicId = `${folderName}/${folderName}/${fileHash}`;
  return publicId;
}

export function socketResponse(
  io: Server,
  channel: string,
  dest: string,
  { success, message, data }: { success: boolean; message: string; data?: any }
) {
  io.to(dest).emit(channel, {
    success,
    message,
    data,
  });
}

export function isEmptyObject(obj: object): boolean {
  return Object.keys(obj).length === 0;
}

export function validateGiftAudioRocket(
  body: Record<string, unknown>,
  isUpdate: boolean = false
) {
  const { cooldown, milestones, giftPercentage } = body;
  if (isUpdate) {
    if (!cooldown && !milestones && !giftPercentage)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "At least one of cooldown, milestones, or giftPercentage is required for update"
      );
    if (cooldown && isNaN(Number(cooldown)))
      throw new AppError(StatusCodes.BAD_REQUEST, "cooldown must be a number");
    if (milestones && !Array.isArray(milestones))
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "milestones must be an array"
      );
    if (milestones && Array.isArray(milestones) && milestones.length < 1)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "milestones must contain at least one milestone"
      );
    if (milestones && Array.isArray(milestones)) {
      for (let i = 0; i < milestones.length; i++) {
        if (isNaN(Number(milestones[i])))
          throw new AppError(
            StatusCodes.BAD_REQUEST,
            `milestones[${i}] must be a number`
          );
      }
    }
    if (giftPercentage && isNaN(Number(giftPercentage)))
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "giftPercentage must be a number"
      );
  } else {
    if (!cooldown || !milestones || !giftPercentage)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "cooldown, milestones, and giftPercentage are required"
      );
    if (isNaN(Number(cooldown)))
      throw new AppError(StatusCodes.BAD_REQUEST, "cooldown must be a number");
    if (!Array.isArray(milestones))
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "milestones must be an array"
      );
    if (milestones.length < 1)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "milestones must contain at least one milestone"
      );
    for (let i = 0; i < milestones.length; i++) {
      if (isNaN(Number(milestones[i])))
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `milestones[${i}] must be a number`
        );
    }
  }
}

export function getAudioUserSeat(
  userId: string,
  roomData: IAudioRoomData
): string {
  if (
    !isEmptyObject(roomData.premiumSeat.member) &&
    (roomData.premiumSeat.member as IMemberDetails)._id == userId
  ){
    return AudioSeatTypes.Premium; 
  }
  if(roomData.hostDetails?._id == userId) return AudioSeatTypes.Host;
  for (const [seatKey, seat] of Object.entries(roomData.seats)) {
    if (
      !isEmptyObject(seat.member) &&
      (seat.member as IMemberDetails)._id == userId
    ) {
     return seatKey;
    }
  }
  return AudioSeatTypes.Regular;
}


