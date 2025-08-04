import crypto from "crypto";
import AppError from "../errors/app_errors";
import { StatusCodes } from "http-status-codes";
import { AdminPowers, UserRoles } from "./enums";
import { IUserDocument } from "../../models/user/user_model_interface";
import { IAdminDocument } from "../../entities/admin/admin_interface";

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
  myProfile: IUserDocument | IAdminDocument,
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
    userRole == UserRoles.Agency ||
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
