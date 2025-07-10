
import crypto from 'crypto';
import AppError from '../errors/app_errors';
import { StatusCodes } from 'http-status-codes';
import { ModeratorPermissions, UserRoles } from './enums';
import { IUserDocument } from '../../models/user/user_model_interface';
import { IAdminDocument } from '../../entities/admin/admin_interface';

export const generateFileHash = (buffer: Buffer): string => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

export function isVideoFile(filename: string): boolean {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.mkv', '.webm', '.mpeg', '.mp3', '.wav', '.ogg', '.aac', '.flac'];
  const ext = filename.toLowerCase().split('.').pop();
  return ext ? videoExtensions.includes(`.${ext}`) : false;
}

export function validatePromoteUserPermission(permissions: string[]): void {
  if (!permissions) throw new AppError(StatusCodes.BAD_REQUEST, "at least one value in the permissions is required");
  if (!Array.isArray(permissions)) throw new AppError(StatusCodes.BAD_REQUEST, "permissions must be an array");
  if (permissions.length === 0) throw new AppError(StatusCodes.BAD_REQUEST, "permissions array must contain at least one permission");
  const invalidatePermissions = permissions.filter(p => !Object.values(ModeratorPermissions).includes(p as ModeratorPermissions));
  if (invalidatePermissions.length > 0) throw new AppError(StatusCodes.BAD_REQUEST, `Invalid permissions: ${invalidatePermissions.join(", ")}`);
}


export function canUserUpdate(myProfile: IUserDocument | IAdminDocument, requiredPermissions: ModeratorPermissions[]): boolean {
  if (myProfile.userRole == UserRoles.Admin) {
    return true;
  }
  if (myProfile.userRole == UserRoles.Moderator) {
    const hasPermission = (myProfile as IUserDocument).userPermissions.filter(p => requiredPermissions.includes(p as ModeratorPermissions));
    if (hasPermission.length == requiredPermissions.length) return true;
  }

  if (myProfile.userRole == UserRoles.User) return false;
  return false;
}