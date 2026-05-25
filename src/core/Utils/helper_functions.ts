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

import { IUserRepository } from "../../repository/users/user_repository";
import {
  IAudioRoom,
  IAudioRoomDocument,
} from "../../models/audio_room/audio_room_model";
import { IMyBucketDocument } from "../../models/store/my_bucket_model";
import { RepositoryProviders } from "../providers/repository_providers";

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

export function isImageFile(filename: string): boolean {
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"];
  const ext = filename.toLowerCase().split(".").pop();
  return ext ? imageExtensions.includes(`.${ext}`) : false;
}

export function isSvgaFile(filename: string): boolean {
  const ext = filename.toLowerCase().split(".").pop();
  return ext === "svga";
}

export function validatePromoteUserPermission(permissions: string[]): void {
  validatePermissions(permissions);
}

export function canUserUpdate(
  myProfile: IUserDocument | IAdminDocument | IPortalUserDocument,
  requiredPermissions: AdminPowers[],
): boolean {
  if (myProfile.userRole == UserRoles.Admin) {
    return true;
  }

  const hasPermission = (myProfile as IUserDocument).userPermissions.filter(
    (p) => requiredPermissions.includes(p as AdminPowers),
  );

  if (hasPermission.length == requiredPermissions.length) return true;

  if (myProfile.userRole == UserRoles.User) return false;
  return false;
}

export function validateCreatePortalUserData(
  body: Record<string, unknown>,
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
  const allowedAdminRoles = [
    UserRoles.Merchant,
    UserRoles.Reseller,
    UserRoles.SubAdmin,
    UserRoles.Agency,
    UserRoles.CountryAdmin,
    UserRoles.countrySubAdmin,
  ];
  if (!allowedAdminRoles.includes(userRole as UserRoles))
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `Admin cannot create portal user with role -> ${userRole}`,
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
      "permissions array must contain at least one permission",
    );
  const invalidatePermissions = permissions.filter(
    (p: any) => !Object.values(AdminPowers).includes(p as AdminPowers),
  );
  if (invalidatePermissions.length > 0)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `Invalid permissions: ${invalidatePermissions.join(", ")}`,
    );
}

export function validateblockUser(body: any): void {
  const { targetId, zone, date_till } = body;
  if (!targetId || !zone)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Target ID and activity zone are required",
    );
  if (!Object.values(ActivityZoneState).includes(zone))
    throw new AppError(StatusCodes.BAD_REQUEST, "Invalid activity zone");
  if (zone === ActivityZoneState.temporaryBlock && !date_till)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "dateTill is required for temporary block",
    );
}

export function validateWithdrawBonus(body: Record<string, unknown>) {
  const { accountType, accountNumber, totalSalary } = body;
  if (!accountType || !accountNumber || !totalSalary)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Host ID, account type, account number, and total salary are required",
    );
  if (
    !Object.values(WithdrawAccountTypes).includes(
      accountType as WithdrawAccountTypes,
    )
  )
    throw new AppError(StatusCodes.BAD_REQUEST, "Invalid account type");
  // check if host id is a valid mongodbId
  if (isNaN(Number(totalSalary)))
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Total salary must be a number",
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

export function validateNumber(number: any, fieldName: string) {
  if (isNaN(Number(number)))
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `${fieldName} must be a number`,
    );
}

export function validateEnum(value: any, enumObject: any, fieldName: string) {
  if (!value) return;
  if (!Object.values(enumObject).includes(value)) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `Invalid ${fieldName}: ${value}. Expected one of: ${Object.values(
        enumObject,
      ).join(", ")}`,
    );
  }
}

export async function getEquippedItemObjects(
  repository: IMyBucketRepository,
  catRepository: IStoreCategoryRepository,
  userId: string,
): Promise<Record<string, any>> {
  const equippedBucket = await repository.getEquippedBuckets(userId);
  if (!equippedBucket || equippedBucket.length === 0) {
    return {};
  }
  let equippedFeatures: Record<string, Record<string, string> | string[]> = {};
  let privileges: string[] = [];

  for (let i = 0; i < equippedBucket.length; i++) {
    if (
      typeof equippedBucket[i].itemId == "string" ||
      equippedBucket[i].itemId instanceof Types.ObjectId
    ) {
      console.error("itemId is not populated");
      continue;
    }
    const item = equippedBucket[i].itemId as IStoreItem;
    if (!item) continue;

    if (item.privilege && item.privilege.length > 0) {
      privileges.push(...item.privilege);
    }

    if (item.bundleFiles && item.bundleFiles.length > 0) {
      for (let j = 0; j < item.bundleFiles.length; j++) {
        const bundle = item.bundleFiles[j];
        equippedFeatures[bundle.categoryName] = {
          svgaUrl: bundle.svgaFile,
          previewUrl: bundle.previewFile,
        };
      }
    } else {
      const category = await catRepository.getCategoryById(
        item.categoryId as string,
      );
      if (!category) {
        console.error("category not found");
        continue;
      }
      equippedFeatures[category.title] = {
        svgaUrl: item.svgaFile ?? "",
        previewUrl: item.previewFile ?? "",
      };
    }
  }

  if (privileges.length > 0) {
    // Remove duplicates recursively across all items
    equippedFeatures["privilege"] = Array.from(new Set(privileges));
  }

  return equippedFeatures;
}

export async function checkBoughtSvip(
  userId: string,
  repository: IMyBucketRepository,
) {
  // ── Premium VIP / SVIP detection ─────────────────────────────────────────
  // Fetch all premium bucket items for the user (no useStatus filter).
  // Find the first store item whose name starts with "SVIP" or "VIP" and
  // shape it to { logo, name, svgaFile, previewFile } using the "svga_tag"
  // bundle entry — mirroring the aggregation pipeline logic.
  const premiumBuckets = await repository.getAllPremiumItems(userId);

  let svipItem: Record<string, any> = {
    name: null,
    logo: null,
    svgaFile: null,
    previewFile: null,
  };

  for (const bucket of premiumBuckets) {
    if (
      typeof bucket.itemId === "string" ||
      bucket.itemId instanceof Types.ObjectId
    ) {
      continue; // itemId not populated, skip
    }

    const premiumStoreItem = bucket.itemId as IStoreItem;
    if (!premiumStoreItem?.name) continue;

    const isPremiumSVIP = premiumStoreItem.name.startsWith("SVIP");

    if (!isPremiumSVIP) continue;

    // Find the "svga_tag" bundle entry for svgaFile / previewFile
    const tagBundle = premiumStoreItem.bundleFiles?.find(
      (b) => b.categoryName === "svga_tag",
    );

    const shaped: Record<string, any> = {
      name: premiumStoreItem.name,
      logo: premiumStoreItem.logo ?? null,
      svgaFile: tagBundle?.svgaFile ?? null,
      previewFile: tagBundle?.previewFile ?? null,
    };

    svipItem = shaped;
  }
  // ─────────────────────────────────────────────────────────────────────────
  return svipItem;
}

export async function checkBoughtVip(
  userId: string,
  repository: IMyBucketRepository,
) {
  // ── Premium VIP / SVIP detection ─────────────────────────────────────────
  // Fetch all premium bucket items for the user (no useStatus filter).
  // Find the first store item whose name starts with "SVIP" or "VIP" and
  // shape it to { logo, name, svgaFile, previewFile } using the "svga_tag"
  // bundle entry — mirroring the aggregation pipeline logic.
  const premiumBuckets = await repository.getAllPremiumItems(userId);

  let vipItem: Record<string, any> = {
    name: null,
    logo: null,
    svgaFile: null,
    previewFile: null,
  };

  for (const bucket of premiumBuckets) {
    if (
      typeof bucket.itemId === "string" ||
      bucket.itemId instanceof Types.ObjectId
    ) {
      continue; // itemId not populated, skip
    }

    const premiumStoreItem = bucket.itemId as IStoreItem;
    if (!premiumStoreItem?.name) continue;

    const isPremiumVIP = premiumStoreItem.name.startsWith("VIP");

    if (!isPremiumVIP) continue;

    // Find the "svga_tag" bundle entry for svgaFile / previewFile
    const tagBundle = premiumStoreItem.bundleFiles?.find(
      (b) => b.categoryName === "svga_tag",
    );

    const shaped: Record<string, any> = {
      name: premiumStoreItem.name,
      logo: premiumStoreItem.logo ?? null,
      svgaFile: tagBundle?.svgaFile ?? null,
      previewFile: tagBundle?.previewFile ?? null,
    };

    vipItem = shaped;
  }
  // ─────────────────────────────────────────────────────────────────────────
  return vipItem;
}

export async function getMyBucketItems(
  repository: IMyBucketRepository,
  userId: string,
): Promise<Record<string, any[]>> {
  const myBuckets = await repository.getAllBucketsByCategoryGrouped(userId);

  const transformedBuckets: Record<string, any[]> = {};
  for (const key in myBuckets) {
    transformedBuckets[key] = myBuckets[key].map((bucket) => {
      const item = bucket.itemId as IStoreItem;
      return {
        name: item.name,
        logo: item.logo,
        isPremium: item.isPremium,
        previewFile: item.previewFile,
      };
    });
  }

  return transformedBuckets;
}
// export async function checkPremiumItem(
//   repository: IMyBucketRepository,
//   userId: string,
// ): Promise<boolean> {
//   const equippedBucket = await repository.getEquippedBuckets(userId);

//   if (equippedBucket.length != 1) return false;

//   if (
//     typeof equippedBucket[0].itemId == "string" ||
//     equippedBucket[0].itemId instanceof Types.ObjectId
//   ) {
//     console.log("itemId is not populated");
//     return false;
//   }
//   const item = equippedBucket[0].itemId as IStoreItem;
//   if (item.isPremium && item.name == "SVIP") return true;
//   return false;
// }

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
  // Decode URL to handle spaces/special characters
  const decodedUrl = decodeURIComponent(url);
  const parts = new URL(decodedUrl).pathname.split("/");

  // Identify the resource type (image, video, raw)
  // URL structure: /<cloud_name>/<resource_type>/<delivery_type>/v<version>/<public_id>
  const resourceType = parts[2];
  const isRaw = resourceType === "raw";

  // The public ID starts after the version segment (e.g., /v123456789/)
  const versionIndex = parts.findIndex((part) => /^v\d+$/.test(part));

  if (versionIndex !== -1 && versionIndex < parts.length - 1) {
    const publicIdWithExt = parts.slice(versionIndex + 1).join("/");
    if (isRaw) return publicIdWithExt; // Keep extension for raw files

    const lastDot = publicIdWithExt.lastIndexOf(".");
    return lastDot === -1
      ? publicIdWithExt
      : publicIdWithExt.substring(0, lastDot);
  }

  // Fallback 1: Use everything after the delivery type (upload, private, authenticated)
  const deliveryIndex = parts.findIndex(
    (part) =>
      part === "upload" || part === "private" || part === "authenticated",
  );
  if (deliveryIndex !== -1 && deliveryIndex < parts.length - 1) {
    const publicIdWithExt = parts.slice(deliveryIndex + 1).join("/");
    if (isRaw) return publicIdWithExt;

    const lastDot = publicIdWithExt.lastIndexOf(".");
    return lastDot === -1
      ? publicIdWithExt
      : publicIdWithExt.substring(0, lastDot);
  }

  // Fallback 2: Just use the last two parts (folder/id)
  const fileName = parts[parts.length - 1];
  const folderName = parts[parts.length - 2];

  if (isRaw) return `${folderName}/${fileName}`;

  const lastDot = fileName.lastIndexOf(".");
  const fileId = lastDot === -1 ? fileName : fileName.substring(0, lastDot);
  return `${folderName}/${fileId}`;
}

export function isEmptyObject(obj: object): boolean {
  return Object.keys(obj).length === 0;
}

export function validateGiftAudioRocket(
  body: Record<string, unknown>,
  isUpdate: boolean = false,
) {
  const { cooldown, milestones, giftPercentage } = body;
  if (isUpdate) {
    if (!cooldown && !milestones && !giftPercentage)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "At least one of cooldown, milestones, or giftPercentage is required for update",
      );
    if (cooldown && isNaN(Number(cooldown)))
      throw new AppError(StatusCodes.BAD_REQUEST, "cooldown must be a number");
    if (milestones && !Array.isArray(milestones))
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "milestones must be an array",
      );
    if (milestones && Array.isArray(milestones) && milestones.length < 1)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "milestones must contain at least one milestone",
      );
    if (milestones && Array.isArray(milestones)) {
      for (let i = 0; i < milestones.length; i++) {
        if (isNaN(Number(milestones[i])))
          throw new AppError(
            StatusCodes.BAD_REQUEST,
            `milestones[${i}] must be a number`,
          );
      }
    }
    if (giftPercentage && isNaN(Number(giftPercentage)))
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "giftPercentage must be a number",
      );
  } else {
    if (!cooldown || !milestones || !giftPercentage)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "cooldown, milestones, and giftPercentage are required",
      );
    if (isNaN(Number(cooldown)))
      throw new AppError(StatusCodes.BAD_REQUEST, "cooldown must be a number");
    if (!Array.isArray(milestones))
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "milestones must be an array",
      );
    if (milestones.length < 1)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "milestones must contain at least one milestone",
      );
    for (let i = 0; i < milestones.length; i++) {
      if (isNaN(Number(milestones[i])))
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `milestones[${i}] must be a number`,
        );
    }
  }
}

export function isTheDateFromThisMonth(date: Date): boolean {
  const today = new Date();
  return (
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function socketResponse(
  io: Server,
  channel: string,
  dest: string,
  { success, message, data }: { success: boolean; message: string; data?: any },
) {
  io.to(dest).emit(channel, {
    success,
    message,
    data,
  });
}

export function getRandomNumberFromRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function isValidMongooseToken(id: string): boolean {
  // user regex to find out if the id is a valid mongoose id
  const regex = /^[0-9a-fA-F]{24}$/;
  const res = regex.test(id);
  return res;
}

export function aggregatedUserOmmitedFields() {
  return {
    userStateInApp: 0,
    userPermissions: 0,
    userRole: 0,
    isViewer: 0,
    activityZone: 0,
    createdAt: 0,
    updatedAt: 0,
    whoCanTextMe: 0,
    highLevelRequirements: 0,
    parentCreator: 0,
    password: 0,
    totalEarnedXp: 0,
    verified: 0,
    nameUpdateDate: 0,
    totalEarnedGiftInRoom: 0,
    countryLanguages: 0,
    totalBoughtCoins: 0,
    __v: 0,
    email: 0,
  };
}

export function validateReferralConfig(body: Record<string, any>): void {
  const {
    inviteReward,
    rechargeThreshold,
    rechargeReward,
    giftCommissionPercentage,
  } = body;

  if (
    inviteReward === undefined ||
    rechargeThreshold === undefined ||
    rechargeReward === undefined ||
    giftCommissionPercentage === undefined
  ) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "All fields (inviteReward, rechargeThreshold, rechargeReward, giftCommissionPercentage) are required",
    );
  }

  if (isNaN(Number(inviteReward)) || Number(inviteReward) < 0) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "inviteReward must be a non-negative number",
    );
  }

  if (isNaN(Number(rechargeThreshold)) || Number(rechargeThreshold) < 0) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "rechargeThreshold must be a non-negative number",
    );
  }

  if (isNaN(Number(rechargeReward)) || Number(rechargeReward) < 0) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "rechargeReward must be a non-negative number",
    );
  }

  if (
    isNaN(Number(giftCommissionPercentage)) ||
    Number(giftCommissionPercentage) < 0 ||
    Number(giftCommissionPercentage) > 100
  ) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "giftCommissionPercentage must be a number between 0 and 100",
    );
  }
}

export function validateReferralConfigUpdate(body: Record<string, any>): void {
  const {
    inviteReward,
    rechargeThreshold,
    rechargeReward,
    giftCommissionPercentage,
  } = body;

  if (
    inviteReward === undefined &&
    rechargeThreshold === undefined &&
    rechargeReward === undefined &&
    giftCommissionPercentage === undefined
  ) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "At least one field (inviteReward, rechargeThreshold, rechargeReward, or giftCommissionPercentage) is required for update",
    );
  }

  if (inviteReward !== undefined && (isNaN(Number(inviteReward)) || Number(inviteReward) < 0)) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "inviteReward must be a non-negative number",
    );
  }

  if (rechargeThreshold !== undefined && (isNaN(Number(rechargeThreshold)) || Number(rechargeThreshold) < 0)) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "rechargeThreshold must be a non-negative number",
    );
  }

  if (rechargeReward !== undefined && (isNaN(Number(rechargeReward)) || Number(rechargeReward) < 0)) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "rechargeReward must be a non-negative number",
    );
  }

  if (
    giftCommissionPercentage !== undefined &&
    (isNaN(Number(giftCommissionPercentage)) ||
      Number(giftCommissionPercentage) < 0 ||
      Number(giftCommissionPercentage) > 100)
  ) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "giftCommissionPercentage must be a number between 0 and 100",
    );
  }
}
