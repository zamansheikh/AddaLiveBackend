import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IUserDocument } from "../../models/user/user_model_interface";
import {
  IUserStats,
  IUSerStatsDocument,
} from "../../entities/userstats/userstats_interface";
import IUserStatsRepository from "../../repository/userstats/userstats_repository_interface";
import { IAdminRepository } from "../../repository/admin/admin_repository";
import { IAdmin, IAdminDocument } from "../../entities/admin/admin_interface";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  CloudinaryFolder,
  AdminPowers,
  UserRoles,
} from "../../core/Utils/enums";
import { IPagination } from "../../core/Utils/query_builder";
import { IUserRepository } from "../../repository/user_repository";
import { canUserUpdate, isVideoFile } from "../../core/Utils/helper_functions";
import mongoose from "mongoose";
import { appendFile } from "fs";
import { IGift, IGiftDocument } from "../../entities/admin/gift_interface";
import { IGiftRepository } from "../../repository/gifts/gifts_repositories";
import { uploadFileToCloudinary } from "../../core/Utils/upload_file_cloudinary";
import { Transaction } from "mongodb";
import { IPortalUser } from "../../entities/portal_users/portal_user_interface";
import { IPortalUserRepository } from "../../repository/portal_user/portal_user_repository";
import PortalUser from "../../models/portal_users/protal_user_model";

export interface IAdminUserService {
  loginAdmin(credentials: {
    username: string;
    password: string;
  }): Promise<{ user: IAdminDocument; token: string }>;
  registerAdmin(admin: IAdmin): Promise<IAdminDocument | null>;
  updateAdmin(
    id: string,
    admin: Partial<IAdmin>
  ): Promise<IAdminDocument | null>;
  deleteAdmin(id: string): Promise<IAdminDocument | null>;
  getAdminProfile(id: string): Promise<IAdminDocument | null>;
  retrieveAllUsers(
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }>;
  updateActivityZone({
    id,
    zone,
    dateTill,
  }: {
    id: string;
    zone: "safe" | "temp_block" | "permanent_block";
    dateTill?: string;
  }): Promise<IUserDocument | null>;
  updateUserStat(body: {
    diamonds?: number;
    stars?: number;
    userId: string;
  }): Promise<IUSerStatsDocument>;
  getAllModerators(
    query: Record<string, unknown>
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }>;
  updatePermissions(
    id: string,
    permissions: string[]
  ): Promise<IUserDocument | null>;
  removePermissions(
    id: string,
    permissions: string[]
  ): Promise<IUserDocument | null>;
  createGift(gift: IGift): Promise<IGiftDocument>;
  getGifts(): Promise<IGiftDocument[]>;
  updateGift(id: string, gift: Partial<IGift>): Promise<IGiftDocument>;
  deleteGift(id: string): Promise<IGiftDocument>;
  getGiftCategories(query: Record<string, string>): Promise<string[]>;
  createPortalUser(user: IPortalUser): Promise<IPortalUser>;
  getPortalUser(id: string): Promise<IPortalUser>;
  deletePortalUser(id: string): Promise<IPortalUser>;
}

export default class AdminUserService implements IAdminUserService {
  UserRepository: IUserRepository;
  UserStatsRepository: IUserStatsRepository;
  AdminRepository: IAdminRepository;
  GiftRepository: IGiftRepository;
  PortalUserRepository: IPortalUserRepository;
  constructor(
    UserRepository: IUserRepository,
    UserStatsRepository: IUserStatsRepository,
    AdminRepository: IAdminRepository,
    giftRepository: IGiftRepository,
    PortalUserRepository: IPortalUserRepository
  ) {
    this.UserRepository = UserRepository;
    this.UserStatsRepository = UserStatsRepository;
    this.AdminRepository = AdminRepository;
    this.GiftRepository = giftRepository;
    this.PortalUserRepository = PortalUserRepository;
  }

  async loginAdmin(credentials: {
    username: string;
    password: string;
  }): Promise<{ user: IAdminDocument; token: string }> {
    const admin = await this.AdminRepository.getAdminByUsername(
      credentials.username
    );
    if (!admin) {
      throw new AppError(StatusCodes.NOT_FOUND, "Invalid credentials");
    }
    const isMatch = await bcrypt.compare(credentials.password, admin.password!);
    if (!isMatch) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid credentials");
    }
    const adminObj = admin.toObject();
    delete adminObj.password;

    const jwtSecret = process.env.JWT_SECRET || "secret";

    const token = jwt.sign({ id: admin._id, role: UserRoles.Admin }, jwtSecret);
    return { user: adminObj, token };
  }

  async registerAdmin(admin: IAdmin): Promise<IAdminDocument | null> {
    const existingAdmin = await this.AdminRepository.getAdmin();
    if (existingAdmin) {
      throw new AppError(
        StatusCodes.CONFLICT,
        "You cannot have more than one admin"
      );
    }
    const hashedPass = await bcrypt.hash(admin.password!, 10);
    const newAdmin = await this.AdminRepository.createAdmin({
      ...admin,
      password: hashedPass,
    });
    return newAdmin;
  }

  async updateAdmin(
    id: string,
    admin: Partial<IAdmin>
  ): Promise<IAdminDocument | null> {
    if (admin.password) admin.password = await bcrypt.hash(admin.password, 10);
    const updatedAdmin = await this.AdminRepository.updateAdmin(id, admin);
    if (!updatedAdmin)
      throw new AppError(StatusCodes.NOT_FOUND, "Admin not found");
    return updatedAdmin;
  }

  async deleteAdmin(id: string): Promise<IAdminDocument | null> {
    const deletedAdmin = await this.AdminRepository.deleteAdmin(id);
    if (!deletedAdmin) {
      throw new AppError(StatusCodes.NOT_FOUND, "Admin not found");
    }
    return deletedAdmin;
  }

  async getAdminProfile(id: string): Promise<IAdminDocument | null> {
    const admin = await this.AdminRepository.getAdminById(id);
    if (!admin) {
      throw new AppError(StatusCodes.NOT_FOUND, "Admin not found");
    }
    return admin;
  }

  async retrieveAllUsers(
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }> {
    const users = await this.UserRepository.findAllUser(query);
    return users;
  }

  async updateActivityZone({
    id,
    zone,
    dateTill,
  }: {
    id: string;
    zone: "safe" | "temp_block" | "permanent_block";
    dateTill?: string;
  }) {
    const user = await this.UserRepository.findUserById(id);
    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");

    let payload: Record<string, any> = {};
    payload["zone"] = zone;
    payload["createdAt"] = new Date().toISOString();
    if (zone === "temp_block" && dateTill == null)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "date_till is required for temporary block"
      );
    if (zone === "temp_block" && dateTill != null) {
      payload["expire"] = dateTill;
    }
    const finalPayload = { activityZone: payload };
    return await this.UserRepository.findUserByIdAndUpdate(id, finalPayload);
  }

  async updateUserStat(body: {
    diamonds?: number;
    stars?: number;
    userId: string;
  }): Promise<IUSerStatsDocument> {
    let userStatReturnBody = await this.UserStatsRepository.getUserStats(
      body.userId
    );

    if (!userStatReturnBody)
      throw new AppError(StatusCodes.NOT_FOUND, "User stats not found");
    userStatReturnBody = null;
    if (body.diamonds) {
      userStatReturnBody = await this.UserStatsRepository.updateDiamonds(
        body.userId,
        body.diamonds
      );
      if (!userStatReturnBody)
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "failed update diamonds"
        );
    }
    if (body.stars) {
      userStatReturnBody = await this.UserStatsRepository.updateStars(
        body.userId,
        body.stars
      );
      if (!userStatReturnBody)
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "failed update stars"
        );
    }

    return userStatReturnBody!;
  }

  async getAllModerators(
    query: Record<string, unknown>
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }> {
    const moderators = await this.UserRepository.getAllModarators(query);
    return moderators;
  }

  async updatePermissions(
    id: string,
    permissions: string[]
  ): Promise<IUserDocument | null> {
    const user = await this.UserRepository.findUserById(id);
    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }
    if (user.userRole !== UserRoles.Agency) {
      throw new AppError(StatusCodes.BAD_REQUEST, "User is not a moderator");
    }

    if (user.userPermissions.length === 0) {
      const demotedUser = await this.UserRepository.findUserByIdAndUpdate(id, {
        userRole: UserRoles.User,
      });
      if (demotedUser)
        throw new AppError(
          StatusCodes.CONFLICT,
          "The user had no previous permissions demoted to user"
        );
    }

    const invalidPermission = user.userPermissions.filter((p) =>
      permissions.includes(p)
    );
    if (invalidPermission.length > 0) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Already has permissions: ${invalidPermission.join(", ")}`
      );
    }

    const addPermissions = permissions.map((p) =>
      this.UserRepository.addPermission(id, p)
    );
    const updatedUser = await Promise.all(addPermissions);
    return updatedUser[updatedUser.length - 1];
  }

  async removePermissions(
    id: string,
    permissions: string[]
  ): Promise<IUserDocument | null> {
    const user = await this.UserRepository.findUserById(id);
    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    if (user.userRole !== UserRoles.Agency) {
      throw new AppError(StatusCodes.BAD_REQUEST, "User is not a moderator");
    }

    if (user.userPermissions.length === 0) {
      const demotedUser = await this.UserRepository.findUserByIdAndUpdate(id, {
        userRole: UserRoles.User,
      });
      if (demotedUser)
        throw new AppError(
          StatusCodes.CONFLICT,
          "The user had no previous permissions demoted to user"
        );
    }

    if (
      user.userPermissions.length === 1 ||
      user.userPermissions.length === permissions.length
    ) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "You cannot remove all permissions. Demote the user instead"
      );
    }

    const invalidPermission = permissions.filter(
      (p) => !user.userPermissions.includes(p)
    );
    if (invalidPermission.length > 0) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Does not have permissions: ${invalidPermission.join(", ")}`
      );
    }

    const removePermissions = permissions.map((p) =>
      this.UserRepository.removePermission(id, p)
    );
    const updatedUser = await Promise.all(removePermissions);
    return updatedUser[updatedUser.length - 1];
  }

  async createGift(gift: IGift): Promise<IGiftDocument> {
    const previewImageUrl = await uploadFileToCloudinary({
      isVideo: false,
      folder: CloudinaryFolder.giftAssets,
      file: gift.previewImage as Express.Multer.File,
    });
    if (!previewImageUrl)
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to upload prviewImage"
      );
    gift.previewImage = previewImageUrl;
    const svgaImageUrl = await uploadFileToCloudinary({
      isVideo: false,
      folder: CloudinaryFolder.giftAssets,
      file: gift.svgaImage as Express.Multer.File,
    });
    if (!svgaImageUrl)
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to upload svgaImage"
      );
    gift.svgaImage = svgaImageUrl;

    const newGift = await this.GiftRepository.createGift(gift);
    return newGift;
  }

  async getGifts(): Promise<IGiftDocument[]> {
    const gifts = await this.GiftRepository.getGifts();
    return gifts;
  }

  async updateGift(id: string, gift: Partial<IGift>): Promise<IGiftDocument> {
    if (gift.previewImage) {
      const previewUrl = await uploadFileToCloudinary({
        isVideo: false,
        folder: CloudinaryFolder.giftAssets,
        file: gift.previewImage as Express.Multer.File,
      });
      if (!previewUrl)
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to upload image"
        );
      gift.previewImage = previewUrl;
    }
    if (gift.svgaImage) {
      const svgaUrl = await uploadFileToCloudinary({
        isVideo: false,
        folder: CloudinaryFolder.giftAssets,
        file: gift.svgaImage as Express.Multer.File,
      });
      if (!svgaUrl)
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to upload image"
        );
      gift.svgaImage = svgaUrl;
    }
    const updatedGift = await this.GiftRepository.updateGift(id, gift);
    if (!updatedGift)
      throw new AppError(StatusCodes.NOT_FOUND, "Gift not found");
    return updatedGift;
  }

  async deleteGift(id: string): Promise<IGiftDocument> {
    const deletedGift = await this.GiftRepository.deleteGift(id);
    if (!deletedGift)
      throw new AppError(StatusCodes.NOT_FOUND, "Gift not found");
    return deletedGift;
  }

  async getGiftCategories(query: Record<string, string>): Promise<string[]> {
    const categories = await this.GiftRepository.getGiftCategories(query);
    const values = categories.map((category) => category.category);
    return values;
  }

  async createPortalUser(user: IPortalUser): Promise<IPortalUser> {
    const existingUserId =
      await this.PortalUserRepository.getPortalUserByUserId(user.userId);
    if (existingUserId)
      throw new AppError(
        StatusCodes.CONFLICT,
        `UserId -> ${user.userId} already exists`
      );
    const hashedPassword = await bcrypt.hash(user.password, 10);
    user.password = hashedPassword;
    const newPortalUser = await this.PortalUserRepository.createPortalUser(
      user
    );
    if (!newPortalUser)
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to create portal user"
      );
    return newPortalUser;
  }
  async getPortalUser(id: string): Promise<IPortalUser> {
    const role = await this.PortalUserRepository.getPortalUserById(id);
    if (!role)
      throw new AppError(StatusCodes.NOT_FOUND, "Role details not found");
    return role;
  }

  async deletePortalUser(id: string): Promise<IPortalUser> {
    const deletedRole = await this.PortalUserRepository.deletePortalUser(id);
    if (!deletedRole)
      throw new AppError(StatusCodes.NOT_FOUND, "Role not found");
    return deletedRole;
  }
  
}
