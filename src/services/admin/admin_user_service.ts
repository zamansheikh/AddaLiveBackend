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
  ActivityZoneState,
  StatusTypes,
} from "../../core/Utils/enums";
import { IPagination } from "../../core/Utils/query_builder";
import { IUserRepository } from "../../repository/user_repository";
import {
  canUserUpdate,
  getPercentageFromHostCount,
  isVideoFile,
} from "../../core/Utils/helper_functions";
import mongoose, { UpdateResult } from "mongoose";
import { appendFile } from "fs";
import { IGift, IGiftDocument } from "../../entities/admin/gift_interface";
import { IGiftRepository } from "../../repository/gifts/gifts_repositories";
import { uploadFileToCloudinary } from "../../core/Utils/upload_file_cloudinary";
import { Transaction } from "mongodb";
import {
  IPortalUser,
  IPortalUserDocument,
} from "../../entities/portal_users/portal_user_interface";
import { IPortalUserRepository } from "../../repository/portal_user/portal_user_repository";
import PortalUser from "../../models/portal_users/protal_user_model";
import { IWithdrawBonusRepository } from "../../repository/room/withdraw_bonus_repository";
import { IWithdrawBonusDocument } from "../../models/room/withdraw_bonus_model";
import {
  ISalary,
  ISalaryDocument,
} from "../../models/salary/salaryModelInterface";
import { ISalaryRepository } from "../../repository/salary/salary_repository";

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
  assignCoinToSelf(id: string, coins: number): Promise<IAdminDocument | null>;

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
  // updatePermissions(
  //   id: string,
  //   permissions: string[]
  // ): Promise<IUserDocument | null>;
  // removePermissions(
  //   id: string,
  //   permissions: string[]
  // ): Promise<IUserDocument | null>;
  createGift(gift: IGift): Promise<IGiftDocument>;
  getGifts(): Promise<IGiftDocument[]>;
  updateGift(id: string, gift: Partial<IGift>): Promise<IGiftDocument>;
  deleteGift(id: string): Promise<IGiftDocument>;
  getGiftCategories(query: Record<string, string>): Promise<string[]>;
  createPortalUser(user: IPortalUser): Promise<IPortalUser>;
  getPortalUser(id: string): Promise<IPortalUser>;
  deletePortalUser(id: string): Promise<IPortalUser>;
  addPermissionsToPortalUser(
    roleId: string,
    permissions: string[]
  ): Promise<IPortalUser>;
  removePermissionsFromPortalUser(
    roleId: string,
    permissions: string[]
  ): Promise<IPortalUser>;
  updateRoleActivityZone(
    id: string,
    zone: ActivityZoneState,
    dateTill: string
  ): Promise<IPortalUserDocument>;
  getWithdrawRequests(
    query: Record<string, unknown>
  ): Promise<{ pagination: IPagination; data: IWithdrawBonusDocument[] }>;
  updateWithdrawBonusStatus(
    bonusId: string,
    status: StatusTypes
  ): Promise<IWithdrawBonusDocument>;
  createSalary(salary: ISalary): Promise<ISalaryDocument>;
  getSalaries(): Promise<ISalaryDocument[]>;
  getSalaryById(id: string): Promise<ISalaryDocument>;
  updateSalary(id: string, salary: Partial<ISalary>): Promise<ISalaryDocument>;
  deleteSalary(id: string): Promise<ISalaryDocument>;
  autoDistributeBonusToAgency(): Promise<{
    total: number;
    paid: number;
    successRate: number;
  }>;
  assignRoleToUser(userId: string, role: UserRoles): Promise<IUserDocument>;
  getUsersBasedOnRole(role: UserRoles, query: Record<string, unknown>): Promise<{
    pagination: IPagination;
    users: IUserDocument[];
  }>;
}

export default class AdminUserService implements IAdminUserService {
  UserRepository: IUserRepository;
  UserStatsRepository: IUserStatsRepository;
  AdminRepository: IAdminRepository;
  GiftRepository: IGiftRepository;
  PortalUserRepository: IPortalUserRepository;
  WithdrawBonusRepository: IWithdrawBonusRepository;
  SalaryRepository: ISalaryRepository;
  constructor(
    UserRepository: IUserRepository,
    UserStatsRepository: IUserStatsRepository,
    AdminRepository: IAdminRepository,
    giftRepository: IGiftRepository,
    PortalUserRepository: IPortalUserRepository,
    WithdrawBonusRepository: IWithdrawBonusRepository,
    SalaryRepository: ISalaryRepository
  ) {
    this.UserRepository = UserRepository;
    this.UserStatsRepository = UserStatsRepository;
    this.AdminRepository = AdminRepository;
    this.GiftRepository = giftRepository;
    this.PortalUserRepository = PortalUserRepository;
    this.WithdrawBonusRepository = WithdrawBonusRepository;
    this.SalaryRepository = SalaryRepository;
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

  async assignCoinToSelf(
    id: string,
    coins: number
  ): Promise<IAdminDocument | null> {
    const existingAdmin = await this.AdminRepository.getAdminById(id);
    if (!existingAdmin)
      throw new AppError(StatusCodes.BAD_GATEWAY, "Invalid token");
    const updateCoin = await this.AdminRepository.updateCoin(id, coins);
    if (!updateCoin)
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to assign coins to self"
      );
    return updateCoin;
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

  // async updatePermissions(
  //   id: string,
  //   permissions: string[]
  // ): Promise<IUserDocument | null> {
  //   const user = await this.UserRepository.findUserById(id);
  //   if (!user) {
  //     throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  //   }
  //   if (user.userRole !== UserRoles.Agency) {
  //     throw new AppError(StatusCodes.BAD_REQUEST, "User is not a moderator");
  //   }

  //   if (user.userPermissions.length === 0) {
  //     const demotedUser = await this.UserRepository.findUserByIdAndUpdate(id, {
  //       userRole: UserRoles.User,
  //     });
  //     if (demotedUser)
  //       throw new AppError(
  //         StatusCodes.CONFLICT,
  //         "The user had no previous permissions demoted to user"
  //       );
  //   }

  //   const invalidPermission = user.userPermissions.filter((p) =>
  //     permissions.includes(p)
  //   );
  //   if (invalidPermission.length > 0) {
  //     throw new AppError(
  //       StatusCodes.BAD_REQUEST,
  //       `Already has permissions: ${invalidPermission.join(", ")}`
  //     );
  //   }

  //   const addPermissions = permissions.map((p) =>
  //     this.UserRepository.addPermission(id, p)
  //   );
  //   const updatedUser = await Promise.all(addPermissions);
  //   return updatedUser[updatedUser.length - 1];
  // }

  // async removePermissions(
  //   id: string,
  //   permissions: string[]
  // ): Promise<IUserDocument | null> {
  //   const user = await this.UserRepository.findUserById(id);
  //   if (!user) {
  //     throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  //   }

  //   if (user.userRole !== UserRoles.Agency) {
  //     throw new AppError(StatusCodes.BAD_REQUEST, "User is not a moderator");
  //   }

  //   if (user.userPermissions.length === 0) {
  //     const demotedUser = await this.UserRepository.findUserByIdAndUpdate(id, {
  //       userRole: UserRoles.User,
  //     });
  //     if (demotedUser)
  //       throw new AppError(
  //         StatusCodes.CONFLICT,
  //         "The user had no previous permissions demoted to user"
  //       );
  //   }

  //   if (
  //     user.userPermissions.length === 1 ||
  //     user.userPermissions.length === permissions.length
  //   ) {
  //     throw new AppError(
  //       StatusCodes.BAD_REQUEST,
  //       "You cannot remove all permissions. Demote the user instead"
  //     );
  //   }

  //   const invalidPermission = permissions.filter(
  //     (p) => !user.userPermissions.includes(p)
  //   );
  //   if (invalidPermission.length > 0) {
  //     throw new AppError(
  //       StatusCodes.BAD_REQUEST,
  //       `Does not have permissions: ${invalidPermission.join(", ")}`
  //     );
  //   }

  //   const removePermissions = permissions.map((p) =>
  //     this.UserRepository.removePermission(id, p)
  //   );
  //   const updatedUser = await Promise.all(removePermissions);
  //   return updatedUser[updatedUser.length - 1];
  // }

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
      isVideo: true,
      folder: CloudinaryFolder.giftAssets,
      file: gift.svgaImage as Express.Multer.File,
      svga: true,
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
    if (user.userRole == UserRoles.Reseller && user.parentCreator == null)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Reseller must have a parent creator"
      );
    if (
      user.userRole == UserRoles.countrySubAdmin &&
      user.parentCreator == null
    )
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Sub Country Admin must have a parent creator"
      );
    if (user.userRole == UserRoles.Agency && user.parentCreator == null)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Agency must have a parent creator"
      );
    if (user.userRole == UserRoles.Reseller) {
      const creatorUser = await this.PortalUserRepository.getPortalUserById(
        user.parentCreator!.toString()
      );
      if (!creatorUser)
        throw new AppError(StatusCodes.NOT_FOUND, "Parent creator not found");
      if (creatorUser.userRole != UserRoles.Merchant)
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          "Parent creator must be a merchant"
        );
    }

    if (user.userRole == UserRoles.Agency) {
      const creatorUser = await this.PortalUserRepository.getPortalUserById(
        user.parentCreator!.toString()
      );
      if (!creatorUser)
        throw new AppError(StatusCodes.NOT_FOUND, "Parent creator not found");
      if (creatorUser.userRole != UserRoles.SubAdmin)
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          "Parent creator must be a Sub Admin"
        );
    }

    if (user.userRole == UserRoles.countrySubAdmin) {
      const creatorUser = await this.PortalUserRepository.getPortalUserById(
        user.parentCreator!.toString()
      );
      if (!creatorUser)
        throw new AppError(StatusCodes.NOT_FOUND, "Parent creator not found");
      if (creatorUser.userRole != UserRoles.CountryAdmin)
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          "Parent creator must be a Country Admin"
        );
    }

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

  async addPermissionsToPortalUser(
    roleId: string,
    permissions: string[]
  ): Promise<IPortalUser> {
    const portalUser = await this.PortalUserRepository.getPortalUserById(
      roleId
    );
    if (!portalUser) {
      throw new AppError(StatusCodes.NOT_FOUND, "Portal user not found");
    }

    const existingPermissions = new Set(portalUser.userPermissions);
    const permissionsToAdd = permissions.filter(
      (p) => !existingPermissions.has(p)
    );

    if (permissionsToAdd.length === 0) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "All specified permissions already exist for this role."
      );
    }

    const updatedPermissions = [...existingPermissions, ...permissionsToAdd];

    const updatedPortalUser = await this.PortalUserRepository.updatePortalUser(
      roleId,
      { userPermissions: updatedPermissions }
    );
    if (!updatedPortalUser) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to add permissions to portal user"
      );
    }
    return updatedPortalUser;
  }

  async removePermissionsFromPortalUser(
    roleId: string,
    permissions: string[]
  ): Promise<IPortalUser> {
    const portalUser = await this.PortalUserRepository.getPortalUserById(
      roleId
    );
    if (!portalUser) {
      throw new AppError(StatusCodes.NOT_FOUND, "Portal user not found");
    }

    const existingPermissions = new Set(portalUser.userPermissions);
    const permissionsToRemove = permissions.filter((p) =>
      existingPermissions.has(p)
    );

    if (permissionsToRemove.length === 0) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "None of the specified permissions exist for this role."
      );
    }

    const updatedPermissions = portalUser.userPermissions.filter(
      (p) => !permissionsToRemove.includes(p)
    );

    const updatedPortalUser = await this.PortalUserRepository.updatePortalUser(
      roleId,
      { userPermissions: updatedPermissions }
    );
    if (!updatedPortalUser) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to remove permissions from portal user"
      );
    }
    return updatedPortalUser;
  }

  async updateRoleActivityZone(
    id: string,
    zone: ActivityZoneState,
    dateTill: string
  ): Promise<IPortalUserDocument> {
    const portalUser = await this.PortalUserRepository.getPortalUserById(id);
    if (!portalUser) {
      throw new AppError(StatusCodes.NOT_FOUND, "Portal user not found");
    }

    let payload: Record<string, any> = {};
    payload["zone"] = zone;
    payload["createdAt"] = new Date().toISOString();

    if (zone === ActivityZoneState.temporaryBlock && dateTill != null) {
      payload["expire"] = dateTill;
    }
    const finalPayload = { activityZone: payload };
    const updatedPortalUser = await this.PortalUserRepository.updatePortalUser(
      id,
      finalPayload
    );
    if (!updatedPortalUser) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to update portal user activity zone"
      );
    }
    return updatedPortalUser;
  }

  async getWithdrawRequests(
    query: Record<string, unknown>
  ): Promise<{ pagination: IPagination; data: IWithdrawBonusDocument[] }> {
    const withdrawRequests =
      await this.WithdrawBonusRepository.getWithDrawBonus(query);
    return withdrawRequests;
  }

  async updateWithdrawBonusStatus(
    bonusId: string,
    status: StatusTypes
  ): Promise<IWithdrawBonusDocument> {
    const withdrawBonus = await this.WithdrawBonusRepository.getBonusWithId(
      bonusId
    );
    if (!withdrawBonus) {
      throw new AppError(StatusCodes.NOT_FOUND, "Withdraw bonus not found");
    }

    const updatedWithdrawBonus =
      await this.WithdrawBonusRepository.updateWithdrawBonus(bonusId, {
        status: status,
      });
    if (!updatedWithdrawBonus) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to update withdraw bonus status"
      );
    }
    return updatedWithdrawBonus;
  }

  async createSalary(salary: ISalary): Promise<ISalaryDocument> {
    const newSalary = await this.SalaryRepository.createSalary(salary);
    return newSalary;
  }

  async getSalaries(): Promise<ISalaryDocument[]> {
    const salaries = await this.SalaryRepository.getAllSalaries();
    return salaries;
  }
  async getSalaryById(id: string): Promise<ISalaryDocument> {
    const salary = await this.SalaryRepository.getSalaryById(id);

    if (!salary) {
      throw new AppError(StatusCodes.NOT_FOUND, "Salary not found");
    }
    return salary;
  }
  async updateSalary(
    id: string,
    salary: Partial<ISalary>
  ): Promise<ISalaryDocument> {
    const updatedSalary = await this.SalaryRepository.updateSalary(id, salary);
    return updatedSalary;
  }

  async deleteSalary(id: string): Promise<ISalaryDocument> {
    const deletedSalary = await this.SalaryRepository.deleteSalary(id);
    return deletedSalary;
  }

  async autoDistributeBonusToAgency(): Promise<{
    total: number;
    paid: number;
    successRate: number;
  }> {
    const today = new Date();
    const date = today.getDate();
    if (date != 16 && date != 1)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `${date} is not salary day, 16th or the 1st day of the next month is`
      );

    const agencyArray =
      await this.WithdrawBonusRepository.getAgencyPerformance();

    let total = 0;
    let paid = 0;

    const session = await mongoose.startSession();
    session.startTransaction();

    for (let i = 0; i < agencyArray.length; i++) {
      const agency = agencyArray[i];
      const moneyShare =
        agency.totalSalarySum * getPercentageFromHostCount(agency.totalHost);
      const diamondBonus = (100000 / 1200) * moneyShare;
      if (diamondBonus != 0) {
        const agencyAcc = await this.PortalUserRepository.getPortalUserById(
          agency.agencyId
        );
        if (
          agencyAcc?.updatedAt.getDate() == 16 ||
          agencyAcc?.updatedAt.getDate() == 1
        )
          throw new AppError(
            StatusCodes.BAD_REQUEST,
            "agencies already been paid"
          );
        if (!agencyAcc)
          throw new AppError(StatusCodes.NOT_FOUND, "Agency not found");
        agencyAcc.diamonds += diamondBonus;
        await agencyAcc.save({ session });
        paid += 1;
        total += 1;
      }
      total += 1;
    }
    await session.commitTransaction();
    session.endSession();

    return { total, paid, successRate: (paid / total) * 100 };
  }

  async assignRoleToUser(
    userId: string,
    role: UserRoles
  ): Promise<IUserDocument> {
    const user = await this.UserRepository.findUserById(userId);
    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    const updatedUser = await this.UserRepository.findUserByIdAndUpdate(
      userId,
      { userRole: role }
    );
    if (!updatedUser) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to assign role to user"
      );
    }
    return updatedUser;
  }

  async getUsersBasedOnRole(role: UserRoles, query: Record<string, unknown>): Promise<{
    pagination: IPagination;
    users: IUserDocument[];
  }> {
    const users = await this.UserRepository.getUserByRole(role, query);
    return users;
  }
}
