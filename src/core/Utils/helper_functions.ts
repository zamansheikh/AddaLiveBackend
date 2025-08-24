import crypto from "crypto";
import AppError from "../errors/app_errors";
import { StatusCodes } from "http-status-codes";
import {
  ActivityZoneState,
  AdminPowers,
  UserRoles,
  WithdrawAccountTypes,
} from "./enums";
import { IUserDocument } from "../../models/user/user_model_interface";
import { IAdminDocument } from "../../entities/admin/admin_interface";
import { IPortalUserDocument } from "../../entities/portal_users/portal_user_interface";

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

export function getWithdrawDateBoundaires(): {gte: Date; lte: Date} {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed
  const date = today.getDate();
  const lastDate = new Date(year, month + 1, 0).getDate();

  if (date == 15) {
    return {
      gte: new Date(year, month, 1, 0, 0, 0),
      lte: new Date(year, month, 15, 23, 59, 59),
    };
  } else if (date == lastDate) {
    return {
      gte: new Date(year, month, 15, 0, 0, 0),
      lte: new Date(year, month, lastDate, 23, 59, 59),
    };
  } else throw new AppError(StatusCodes.BAD_REQUEST, "Invalid date");
}
