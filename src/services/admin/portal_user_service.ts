import { StatusCodes } from "http-status-codes";
import {
  ActivityZoneState,
  AdminPowers,
  StatusTypes,
  UserRoles,
  WithdrawAccountTypes,
} from "../../core/Utils/enums";
import { IPagination } from "../../core/Utils/query_builder";
import { IUSerStatsDocument } from "../../entities/userstats/userstats_interface";
import { IUserDocument } from "../../models/user/user_model_interface";
import { IAdminRepository } from "../../repository/admin/admin_repository";
import { IPortalUserRepository } from "../../repository/portal_user/portal_user_repository";
import { IUserRepository } from "../../repository/user_repository";
import IUserStatsRepository from "../../repository/userstats/userstats_repository_interface";
import AppError from "../../core/errors/app_errors";
import { canUserUpdate } from "../../core/Utils/helper_functions";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { IPortalUserDocument } from "../../entities/portal_users/portal_user_interface";
import { uploadFileToCloudinary } from "../../core/Utils/upload_file_cloudinary";
import { IAgencyWithdrawRepository } from "../../repository/room/agency_withdraw_repository";
import { IAgencyWithdrawDocument } from "../../models/room/agency_withdraw_model";
import { ISalaryRepository } from "../../repository/salary/salary_repository";
import { ICoinHistoryRepository } from "../../repository/coins/coinHistoryRepository";
import { ICoinHistory } from "../../models/coins/coinHistoryModel";
import { IHistory } from "../../entities/history/history_interface";
import { appendFile } from "fs";

export interface ISharedPowerService {
  loginPortalUser(
    userId: string,
    password: string
  ): Promise<{ user: IPortalUserDocument; token: string }>;
  updateMyProfile(
    id: string,
    user: Partial<IPortalUserDocument>
  ): Promise<IPortalUserDocument | null>;
  getMyProfile(id: string): Promise<IPortalUserDocument | null>;
  searchUserEmail(
    email: string,
    query: Record<string, unknown>
  ): Promise<{ pagination: IPagination; users: IUserDocument[] } | null>;
  retrieveAllUsers(
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }>;
  promoteUser(
    id: string,
    permissions: string[],
    myId: string,
    myRole: UserRoles
  ): Promise<IUserDocument | null>;
  assignCoinToUser(
    userId: string,
    userRole: UserRoles,
    coins: number,
    myId: string,
    myRole: UserRoles
  ): Promise<IUSerStatsDocument | IPortalUserDocument>;
  demoteUser(
    userId: string,
    myId: string,
    myRole: string
  ): Promise<IUserDocument | null>;
  getPortalUsers(
    userRole: UserRoles,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; data: IPortalUserDocument[] }>;
  getPortalChildUsers(
    userRole: UserRoles,
    parentId: string,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; data: IPortalUserDocument[] }>;
  getHosts(
    parentId: string,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }>;

  agencyWithdraw(
    id: string,
    {
      accountNumber,
      accountType,
      totalSalary,
    }: { accountNumber: string; accountType: string; totalSalary: number }
  ): Promise<IAgencyWithdrawDocument>;

  getAllAgencyList(query: Record<string, any>): Promise<{pagination: IPagination, data: IPortalUserDocument[]}>;
  deleteAgency(agencyId: string):Promise<IPortalUserDocument>;
}

export default class SharedPowerService implements ISharedPowerService {
  UserRepository: IUserRepository;
  UserStatsRepository: IUserStatsRepository;
  AdminRepository: IAdminRepository;
  PortalUserRepository: IPortalUserRepository;
  AgencyWithdrawRepository: IAgencyWithdrawRepository;
  SalaryRepository: ISalaryRepository;
  CoinHistoryRepository: ICoinHistoryRepository;

  constructor(
    UserRepository: IUserRepository,
    UserStatsRepository: IUserStatsRepository,
    AdminRepository: IAdminRepository,
    PortalUserRepository: IPortalUserRepository,
    AgencyWithdrawRepository: IAgencyWithdrawRepository,
    SalaryRepository: ISalaryRepository,
    CoinHistoryRepository: ICoinHistoryRepository
  ) {
    this.UserRepository = UserRepository;
    this.UserStatsRepository = UserStatsRepository;
    this.AdminRepository = AdminRepository;
    this.PortalUserRepository = PortalUserRepository;
    this.AgencyWithdrawRepository = AgencyWithdrawRepository;
    this.SalaryRepository = SalaryRepository;
    this.CoinHistoryRepository = CoinHistoryRepository;
  }

  async loginPortalUser(
    userId: string,
    password: string
  ): Promise<{ user: IPortalUserDocument; token: string }> {
    const existingUser = await this.PortalUserRepository.getPortalUserByUserId(
      userId
    );
    if (!existingUser)
      throw new AppError(StatusCodes.NOT_FOUND, "Invalid credentials");
    const isMatch = await bcrypt.compare(password, existingUser.password!);
    if (!isMatch) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid credentials");
    }
    if (
      existingUser.activityZone?.zone == ActivityZoneState.temporaryBlock &&
      existingUser.activityZone.expire!.toISOString() > new Date().toISOString()
    )
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Your account is temporarily blocked till " +
          existingUser.activityZone.expire!.toDateString()
      );
    if (existingUser.activityZone?.zone == ActivityZoneState.permanentBlock)
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Your account is permanently blocked"
      );
    const SECRET = process.env.JWT_SECRET || "jwt_secret";
    const token = jwt.sign(
      {
        id: existingUser._id,
        role: existingUser.userRole,
        permissions: existingUser.userPermissions,
      },
      SECRET
    );
    return { user: existingUser.toObject(), token };
  }

  async updateMyProfile(
    id: string,
    user: Partial<IPortalUserDocument>
  ): Promise<IPortalUserDocument | null> {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, 10);
    }
    if (user.avatar) {
      user.avatar = await uploadFileToCloudinary({
        file: user.avatar as Express.Multer.File,
        folder: "portal_users",
        isVideo: false,
      });
    }

    const updatedUser = await this.PortalUserRepository.updatePortalUser(
      id,
      user
    );
    if (!updatedUser)
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    return updatedUser;
  }

  async getMyProfile(id: string): Promise<IPortalUserDocument | null> {
    const user = await this.PortalUserRepository.getPortalUserById(id);
    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    return user;
  }

  async searchUserEmail(
    email: string,
    query: Record<string, unknown>
  ): Promise<{ pagination: IPagination; users: IUserDocument[] } | null> {
    const users = await this.UserRepository.searchUserByEmail(email, query);
    return users;
  }

  async retrieveAllUsers(
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }> {
    const users = await this.UserRepository.findAllUser(query);
    return users;
  }

  async promoteUser(
    id: string,
    permissions: string[],
    myId: string,
    myRole: UserRoles
  ): Promise<IUserDocument | null> {
    // checking authority
    if (myRole != UserRoles.Agency)
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        `${UserRoles} is not authorized to promote user to host`
      );
    // get my profile
    const myProfile = await this.PortalUserRepository.getPortalUserById(myId);

    if (!myProfile) throw new AppError(StatusCodes.NOT_FOUND, "Notvalid token");

    // get target user profile
    const user = await this.UserRepository.findUserById(id);
    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }
    if (user.userRole == UserRoles.Host)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `${user.name} already a host`
      );
    const hasPermission = canUserUpdate(myProfile, [AdminPowers.PromoteUser]);
    if (!hasPermission)
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        "You are not authorized to perform this action"
      );

    const updatedUser = await this.UserRepository.findUserByIdAndUpdate(id, {
      userRole: UserRoles.Host,
      parentCreator: myId,
      userPermissions: permissions,
    });

    if (!updatedUser) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to update user"
      );
    }
    return updatedUser;
  }
  async assignCoinToUser(
    userId: string,
    userRole: UserRoles,
    coins: number,
    myId: string,
    role: UserRoles
  ): Promise<IUSerStatsDocument | IPortalUserDocument> {
    // blocking unconventional transactions
    if (
      (role == UserRoles.Admin && userRole != UserRoles.Merchant) ||
      (role == UserRoles.Merchant &&
        !(userRole == UserRoles.Reseller || userRole == UserRoles.User)) ||
      (role == UserRoles.Reseller && userRole != UserRoles.User)
    )
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `${role} cannot assign coins to ${userRole}`
      );

    // fetching target profile
    let targetUserProfile;
    if (userRole == UserRoles.Merchant || userRole == UserRoles.Reseller)
      targetUserProfile = await this.PortalUserRepository.getPortalUserById(
        userId
      );
    else
      targetUserProfile = await this.UserStatsRepository.getUserStats(userId);
    // checking for invalid data
    if (!targetUserProfile)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `User with id ${userId} not found`
      );

    // fetching my profile
    let myProfile;
    if (role == UserRoles.Admin)
      myProfile = await this.AdminRepository.getAdminById(myId);
    else myProfile = await this.PortalUserRepository.getPortalUserById(myId);
    if (!myProfile)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Portal User with id ${myId} not found`
      );

    // starting mongoose transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    // checking if i have sufficient funds
    if (myProfile.coins! < coins)
      throw new AppError(StatusCodes.BAD_REQUEST, `Insufficient funds`);

    // negating coin from my profile
    if (role == UserRoles.Admin)
      await this.AdminRepository.updateCoin(myId, -coins, session);
    else await this.PortalUserRepository.updateCoin(myId, -coins, session);

    // adding coin to the target user
    let transactionUpdate;
    if (userRole == UserRoles.Merchant || userRole == UserRoles.Reseller)
      transactionUpdate = await this.PortalUserRepository.updateCoin(
        userId,
        coins,
        session
      );
    else
      transactionUpdate = await this.UserStatsRepository.updateCoins(
        userId,
        coins,
        session
      );
    // checking if the transaction succeeded
    if (!transactionUpdate)
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to assign coins to user"
      );

    // creating a transaction history
      const historyObj: ICoinHistory = {
        senderRole: role,
        senderId: myId,
        receiverRole: userRole,
        receiverId: userId,
        amount: coins
      }
      const newHistory = await this.CoinHistoryRepository.createHistory(historyObj, session);
      if (!newHistory)
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to create history"
        );

    // commiting the transaction
    await session.commitTransaction();
    session.endSession();

    return transactionUpdate;
  }

  async demoteUser(
    userId: string,
    myId: string,
    myRole: string
  ): Promise<IUserDocument | null> {
    if (myRole != UserRoles.Agency)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "You are not authorized to perform this action"
      );
    const myProfile = await this.PortalUserRepository.getPortalUserById(myId);
    if (!myProfile)
      throw new AppError(StatusCodes.NOT_FOUND, "Not valid token");
    const canDemoteUser = canUserUpdate(myProfile, [AdminPowers.PromoteUser]);

    if (!canDemoteUser)
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        "You are not authorized to perform this action"
      );

    const user = await this.UserRepository.findUserById(userId);
    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }
    if (user.userRole === UserRoles.User) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `${user.name} is already a user`
      );
    }
    const updatedUser = await this.UserRepository.findUserByIdAndUpdate(
      userId,
      { userRole: UserRoles.User, userPermissions: [], parentCreator: null }
    );
    if (!updatedUser) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to demote user"
      );
    }
    return updatedUser;
  }

  async getPortalUsers(
    userRole: UserRoles,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; data: IPortalUserDocument[] }> {
    const users = await this.PortalUserRepository.getPortalUsers(
      userRole,
      query
    );
    return users;
  }

  async getPortalChildUsers(
    userRole: UserRoles,
    parentId: string,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; data: IPortalUserDocument[] }> {
    const users = await this.PortalUserRepository.getPortalChildUsers(
      userRole,
      parentId,
      query
    );
    return users;
  }

  async getHosts(
    parentId: string,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }> {
    const users = await this.UserRepository.getHosts(parentId, query);
    return users;
  }

  async agencyWithdraw(
    id: string,
    {
      accountNumber,
      accountType,
      totalSalary,
    }: { accountNumber: string; accountType: string; totalSalary: number }
  ): Promise<IAgencyWithdrawDocument> {
    // checking for previous withdraw
    const existingWithdraw =
      await this.AgencyWithdrawRepository.getWithdrawWithStatus(
        id,
        StatusTypes.pending
      );
    if (existingWithdraw)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "You have already applied for withdraw"
      );
    await this.SalaryRepository.getSalaryByAmount(totalSalary);
    // getting my profile info
    const myProfile = await this.PortalUserRepository.getPortalUserById(id);
    // checking eligibiility for withdraw
    if (myProfile?.diamonds! < totalSalary)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `your exisitng fund ${myProfile?.diamonds} is not sufficient for ${totalSalary} to withdraw`
      );

    const session = await mongoose.startSession();
    session.startTransaction();

    const update = await this.PortalUserRepository.updateDiamonds(
      id,
      -totalSalary,
      session
    );
    if (!update)
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to update diamonds"
      );
    const withdraw = await this.AgencyWithdrawRepository.createWithdraw(
      {
        accountType: accountType as WithdrawAccountTypes,
        accoutNumber: accountNumber,
        agencyId: id,
        status: StatusTypes.pending,
        totalSalary,
        name: myProfile?.name as string,
        withdrawDate: new Date(),
      },
      session
    );
    if (!withdraw)
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to create withdraw"
      );
    await session.commitTransaction();
    session.endSession();
    return withdraw;
  }

  async getAllAgencyList(query: Record<string, any>): Promise<{ pagination: IPagination; data: IPortalUserDocument[]; }> {
    const res = await this.PortalUserRepository.getAllAgency(query);
    return res;
  }
  async deleteAgency(agencyId: string): Promise<IPortalUserDocument> {
    const profile = await this.PortalUserRepository.getPortalUserById(agencyId);
    if(!profile) throw new AppError(StatusCodes.BAD_REQUEST, `id -> ${agencyId} does not exist`);
    if(profile.userRole != UserRoles.Agency) throw new AppError(StatusCodes.BAD_REQUEST, `${agencyId} belongs to ${profile.userRole} not to an agency`);
    const hostCount = await this.UserRepository.getHostCounts(agencyId);
    if(hostCount != 0) throw new AppError(StatusCodes.CONFLICT, `${profile.name} has ${hostCount} hosts, so cannot be deleted untill host count is 0`);
    const deletedAgency = await this.PortalUserRepository.deletePortalUser(agencyId);
    return deletedAgency;
  }
}
