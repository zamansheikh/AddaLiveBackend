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
import { IUserRepository } from "../../repository/users/user_repository";
import IUserStatsRepository from "../../repository/users/userstats_repository_interface";
import AppError from "../../core/errors/app_errors";
import {
  canUserUpdate,
} from "../../core/Utils/helper_functions";
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
import { IAgencyJoinRequest } from "../../models/request/agencyJoinRequset";
import { IAgencyJoinRequestRepository } from "../../repository/request/AgencyJoinRequestRepository";
import { ILevelTagBg } from "../../models/user/level_tag_bg_model";
import { ILevelTagBgRepository } from "../../repository/users/level_tag_bg_repository";
import { creditRegularUserCoins } from "../coin/coin_utils";
import { XpHelper } from "../../core/helper_classes/xp_helper";

export interface ISharedPowerService {
  loginPortalUser(
    userId: string,
    password: string,
  ): Promise<{ user: IPortalUserDocument; token: string }>;
  updateMyProfile(
    id: string,
    user: Partial<IPortalUserDocument>,
  ): Promise<IPortalUserDocument | null>;
  getMyProfile(id: string): Promise<IPortalUserDocument | null>;
  searchUserEmail(
    email: string,
    query: Record<string, unknown>,
  ): Promise<{ pagination: IPagination; users: IUserDocument[] } | null>;
  searchUserByShortId(id: number): Promise<IUserDocument>;
  retrieveAllUsers(
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }>;
  promoteUser(
    id: string,
    permissions: string[],
    myId: string,
    myRole: UserRoles,
  ): Promise<IUserDocument | null>;
  assignCoinToUser(
    userId: string,
    userRole: UserRoles,
    coins: number,
    myId: string,
    myRole: UserRoles,
  ): Promise<IUSerStatsDocument | IPortalUserDocument>;
  removeCoinFromUser(
    userId: string,
    userRole: UserRoles,
    coins: number,
    myId: string,
    myRole: UserRoles,
  ): Promise<IUSerStatsDocument>;
  demoteUser(
    userId: string,
    myId: string,
    myRole: string,
  ): Promise<IUserDocument | null>;
  getPortalUsers(
    userRole: UserRoles,
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; data: IPortalUserDocument[] }>;
  getPortalChildUsers(
    userRole: UserRoles,
    parentId: string,
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; data: IPortalUserDocument[] }>;
  getHosts(
    parentId: string,
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }>;

  agencyWithdraw(
    id: string,
    {
      accountNumber,
      accountType,
      totalSalary,
    }: { accountNumber: string; accountType: string; totalSalary: number },
  ): Promise<IAgencyWithdrawDocument>;

  getAgencyWithdrawList(
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; data: IAgencyWithdrawDocument[] }>;

  getAllAgencyList(
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; data: IPortalUserDocument[] }>;
  deleteAgency(agencyId: string): Promise<IPortalUserDocument>;
  getAllJoinRequest(
    myId: string,
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; data: IAgencyJoinRequest[] }>;
  updateJoinRequestStatus(
    reqId: string,
    status: StatusTypes,
  ): Promise<{ status: StatusTypes }>;
}

import { IReferralService } from "../referral/referral_service";

export default class SharedPowerService implements ISharedPowerService {
  UserRepository: IUserRepository;
  UserStatsRepository: IUserStatsRepository;
  AdminRepository: IAdminRepository;
  PortalUserRepository: IPortalUserRepository;
  AgencyWithdrawRepository: IAgencyWithdrawRepository;
  SalaryRepository: ISalaryRepository;
  CoinHistoryRepository: ICoinHistoryRepository;
  AgencyJoinRequestRepository: IAgencyJoinRequestRepository;
  LevelTagBgRepository: ILevelTagBgRepository;
  ReferralService: IReferralService;

  constructor(
    UserRepository: IUserRepository,
    UserStatsRepository: IUserStatsRepository,
    AdminRepository: IAdminRepository,
    PortalUserRepository: IPortalUserRepository,
    AgencyWithdrawRepository: IAgencyWithdrawRepository,
    SalaryRepository: ISalaryRepository,
    CoinHistoryRepository: ICoinHistoryRepository,
    AgencyJoinRequestRepository: IAgencyJoinRequestRepository,
    LevelTagBgRepository: ILevelTagBgRepository,
    ReferralService: IReferralService,
  ) {
    this.UserRepository = UserRepository;
    this.UserStatsRepository = UserStatsRepository;
    this.AdminRepository = AdminRepository;
    this.PortalUserRepository = PortalUserRepository;
    this.AgencyWithdrawRepository = AgencyWithdrawRepository;
    this.SalaryRepository = SalaryRepository;
    this.CoinHistoryRepository = CoinHistoryRepository;
    this.AgencyJoinRequestRepository = AgencyJoinRequestRepository;
    this.LevelTagBgRepository = LevelTagBgRepository;
    this.ReferralService = ReferralService;
  }

  async loginPortalUser(
    userId: string,
    password: string,
  ): Promise<{ user: IPortalUserDocument; token: string }> {
    const existingUser =
      await this.PortalUserRepository.getPortalUserByUserId(userId);
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
        existingUser.activityZone.expire!.toDateString(),
      );
    if (existingUser.activityZone?.zone == ActivityZoneState.permanentBlock)
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Your account is permanently blocked",
      );
    const SECRET = process.env.JWT_SECRET || "jwt_secret";
    const token = jwt.sign(
      {
        id: existingUser._id,
        role: existingUser.userRole,
        permissions: existingUser.userPermissions,
      },
      SECRET,
    );
    return { user: existingUser.toObject(), token };
  }

  async updateMyProfile(
    id: string,
    user: Partial<IPortalUserDocument>,
  ): Promise<IPortalUserDocument | null> {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, 10);
    }
    if (user.avatar) {
      user.avatar = await uploadFileToCloudinary({
        file: user.avatar as Express.Multer.File,
        folder: "portal_users",
      });
    }

    const updatedUser = await this.PortalUserRepository.updatePortalUser(
      id,
      user,
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
    query: Record<string, unknown>,
  ): Promise<{ pagination: IPagination; users: IUserDocument[] } | null> {
    const users = await this.UserRepository.searchUserByQuery(query);
    return users;
  }

  async searchUserByShortId(id: number): Promise<IUserDocument> {
    return await this.UserRepository.findUserByShortId(id);
  }

  async retrieveAllUsers(
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }> {
    const users = await this.UserRepository.findAllUser(query);
    return users;
  }

  async promoteUser(
    id: string,
    permissions: string[],
    myId: string,
    myRole: UserRoles,
  ): Promise<IUserDocument | null> {
    // checking authority
    if (myRole != UserRoles.Agency)
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        `${UserRoles} is not authorized to promote user to host`,
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
        `${user.name} already a host`,
      );
    const hasPermission = canUserUpdate(myProfile, [AdminPowers.PromoteUser]);
    if (!hasPermission)
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        "You are not authorized to perform this action",
      );

    const updatedUser = await this.UserRepository.findUserByIdAndUpdate(id, {
      userRole: UserRoles.Host,
      parentCreator: myId,
      userPermissions: permissions,
    });

    if (!updatedUser) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to update user",
      );
    }
    return updatedUser;
  }

  async assignCoinToUser(
    userId: string,
    userRole: UserRoles,
    coins: number,
    myId: string,
    role: UserRoles,
  ): Promise<IUSerStatsDocument | IPortalUserDocument> {
    // The super-admin (portal owner) behaves like Admin here — it can send
    // coins to anyone (general users and resellers included) and its wallet
    // lives in the admins collection.
    const isAdminLevel =
      role === UserRoles.Admin || role === UserRoles.SuperAdmin;

    // ── 1. Validate sender eligibility ──────────────────────────────────────
    const allowedSenders = [
      UserRoles.Admin,
      UserRoles.SuperAdmin,
      UserRoles.SubAdmin,
      UserRoles.Reseller,
    ];
    if (!allowedSenders.includes(role)) {
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        `${role} is not authorized to assign coins`,
      );
    }

    // ── 2. Fetch sender profile from DB (not JWT) ──────────────────────────
    let myProfile;
    if (isAdminLevel)
      myProfile = await this.AdminRepository.getAdminById(myId);
    else
      myProfile = await this.PortalUserRepository.getPortalUserById(myId);

    if (!myProfile)
      throw new AppError(StatusCodes.NOT_FOUND, "Not valid token");

    // ── 3. For SubAdmin, verify coin-distributor permission ─────────────────
    if (role == UserRoles.SubAdmin) {
      const hasPermission = canUserUpdate(myProfile, [AdminPowers.CoinDistribute]);
      if (!hasPermission)
        throw new AppError(
          StatusCodes.UNAUTHORIZED,
          "You do not have the coin-distributor permission to assign coins",
        );
    }

    // ── 4. Validate sender → receiver hierarchy ─────────────────────────────
    // Admin → SubAdmin, Reseller, User
    // SubAdmin (with coin-distributor) → User
    // Reseller → User
    const allowedReceivers: Record<string, UserRoles[]> = {
      [UserRoles.SuperAdmin]: [
        UserRoles.SubAdmin,
        UserRoles.Reseller,
        UserRoles.User,
      ],
      [UserRoles.Admin]: [UserRoles.SubAdmin, UserRoles.Reseller, UserRoles.User],
      [UserRoles.SubAdmin]: [UserRoles.User],
      [UserRoles.Reseller]: [UserRoles.User],
    };

    if (!allowedReceivers[role].includes(userRole)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `${role} cannot assign coins to ${userRole}`,
      );
    }

    // ── 5. Check coin sufficiency ───────────────────────────────────────────
    if ((myProfile.coins ?? 0) < coins)
      throw new AppError(StatusCodes.BAD_REQUEST, "Insufficient coins");

    // ── 6. Fetch target profile from the correct repository ─────────────────
    // Only sub-admins live in the portal_users collection. Re-sellers are app
    // users (a promoted "user" role in the users collection) — so they, like
    // regular users, are fetched from the UserRepository. Treating them as
    // portal users looks them up in the wrong collection → "User not found".
    const portalUserTargets = [UserRoles.SubAdmin];

    let targetProfile;
    if (portalUserTargets.includes(userRole))
      targetProfile = await this.PortalUserRepository.getPortalUserById(userId);
    else
      targetProfile = await this.UserRepository.findUserById(userId);

    if (!targetProfile)
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");

    // ── 7. Verify target user's actual role matches claimed role ────────────
    if (targetProfile.userRole !== userRole) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `User role mismatch: expected "${userRole}", but the target user has role "${targetProfile.userRole}"`,
      );
    }

    // ── 8. Prepare coin history ─────────────────────────────────────────────
    const historyObj: ICoinHistory = {
      senderRole: role,
      senderId: myId,
      receiverRole: userRole,
      receiverId: userId,
      amount: coins,
    };
    let returnBody;

    // ── 9. Execute transaction ───────────────────────────────────────────────
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Deduct coins from sender
      if (isAdminLevel)
        await this.AdminRepository.updateCoin(myId, -coins, session);
      else
        await this.PortalUserRepository.updateCoin(myId, -coins, session);

      // Add coins to receiver
      if (portalUserTargets.includes(userRole)) {
        returnBody = await this.PortalUserRepository.updateCoin(
          userId,
          coins,
          session,
        );
      } else {
        returnBody = await creditRegularUserCoins({
          userId,
          coins,
          targetUser: targetProfile as IUserDocument,
          userRepository: this.UserRepository,
          userStatsRepository: this.UserStatsRepository,
          coinHistoryRepository: this.CoinHistoryRepository,
          senderRole: role,
          senderId: myId,
          receiverRole: userRole,
          session,
        });
      }

      // Portal-user path: create history here (regular users get it via creditRegularUserCoins)
      if (portalUserTargets.includes(userRole)) {
        await this.CoinHistoryRepository.createHistory(historyObj, session);
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // ── XP update for regular app users (fire-and-forget, outside transaction) ─
    if (!portalUserTargets.includes(userRole)) {
      try {
        await XpHelper.getInstance().updateUserXpFromCoin(userId, coins);
      } catch (error) {
        console.error("XP update after coin transfer failed:", error);
      }
    }

    // ── 9. Referral recharge hook (unchanged) ───────────────────────────────
    if (!portalUserTargets.includes(userRole)) {
      try {
        await this.ReferralService.handleRechargeReferral(userId, coins);
      } catch (error) {
        console.error("Referral recharge tracking failed:", error);
      }
    }

    return returnBody;
  }

  /**
   * Removes (deducts) coins from a regular app user — the reverse of
   * `assignCoinToUser`. Admin-level only (Admin / Super Admin).
   *
   * **Key design decisions:**
   * - Only Admin / Super Admin can remove coins; this is a corrective action
   *   (e.g. undoing a wrong top-up), not part of the reseller distribution
   *   chain, so SubAdmin / Reseller are NOT allowed.
   * - Targets are regular app users ("user" / "re-seller") whose balance
   *   lives in `UserStats.coins`. Portal users are out of scope.
   * - Deduction uses `UserStatsRepository.balanceDeduction()`, which
   *   atomically checks `coins >= amount` — removing more than the user has
   *   fails with "not enough coins" instead of going negative.
   * - The removed coins are credited BACK to the admin's wallet, mirroring
   *   how `assignCoinToUser` deducts from it — the coin economy stays
   *   balanced and a wrong transfer can be fully reversed.
   * - `totalBoughtCoins` is decremented (clamped at 0) so the cumulative
   *   figure stays consistent with reversed top-ups.
   * - A coin history record is written with a NEGATIVE amount so audits can
   *   distinguish removals from grants.
   * - XP / SVIP / referral progress earned from the original grant is NOT
   *   rolled back (those flows are additive-only by design).
   */
  async removeCoinFromUser(
    userId: string,
    userRole: UserRoles,
    coins: number,
    myId: string,
    myRole: UserRoles,
  ): Promise<IUSerStatsDocument> {
    // ── 1. Validate sender: admin-level only ────────────────────────────────
    const allowedSenders = [UserRoles.Admin, UserRoles.SuperAdmin];
    if (!allowedSenders.includes(myRole)) {
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        `${myRole} is not authorized to remove coins`,
      );
    }

    const myProfile = await this.AdminRepository.getAdminById(myId);
    if (!myProfile)
      throw new AppError(StatusCodes.NOT_FOUND, "Not valid token");

    // ── 2. Validate target: regular app users only ──────────────────────────
    const allowedTargets = [UserRoles.User, UserRoles.Reseller];
    if (!allowedTargets.includes(userRole)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Coins can only be removed from roles: ${allowedTargets.join(", ")}`,
      );
    }

    const targetProfile = await this.UserRepository.findUserById(userId);
    if (!targetProfile)
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");

    if (targetProfile.userRole !== userRole) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `User role mismatch: expected "${userRole}", but the target user has role "${targetProfile.userRole}"`,
      );
    }

    // ── 3. Execute the reversal inside a transaction ────────────────────────
    const session = await mongoose.startSession();
    session.startTransaction();

    let updatedStats: IUSerStatsDocument;

    try {
      // 3a. Deduct from the user (atomic balance check — throws if too low).
      const statsAfterDeduction = await this.UserStatsRepository.balanceDeduction(
        userId,
        coins,
        session,
      );
      if (!statsAfterDeduction) {
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to deduct coins from user",
        );
      }
      updatedStats = statsAfterDeduction;

      // 3b. Keep the cumulative bought-coins figure consistent (clamp at 0).
      await this.UserRepository.findUserByIdAndUpdate(
        userId,
        {
          totalBoughtCoins: Math.max(
            (targetProfile.totalBoughtCoins ?? 0) - coins,
            0,
          ),
        },
        session,
      );

      // 3c. Return the removed coins to the admin's wallet.
      await this.AdminRepository.updateCoin(myId, coins, session);

      // 3d. Audit record — negative amount marks this as a removal.
      const historyObj: ICoinHistory = {
        senderRole: myRole,
        senderId: myId,
        receiverRole: userRole,
        receiverId: userId,
        amount: -coins,
      };
      await this.CoinHistoryRepository.createHistory(historyObj, session);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    return updatedStats;
  }

  async demoteUser(
    userId: string,
    myId: string,
    myRole: string,
  ): Promise<IUserDocument | null> {
    if (myRole != UserRoles.Agency)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "You are not authorized to perform this action",
      );
    const myProfile = await this.PortalUserRepository.getPortalUserById(myId);
    if (!myProfile)
      throw new AppError(StatusCodes.NOT_FOUND, "Not valid token");
    const canDemoteUser = canUserUpdate(myProfile, [AdminPowers.PromoteUser]);

    if (!canDemoteUser)
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        "You are not authorized to perform this action",
      );

    const user = await this.UserRepository.findUserById(userId);
    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }
    if (user.userRole === UserRoles.User) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `${user.name} is already a user`,
      );
    }
    const updatedUser = await this.UserRepository.findUserByIdAndUpdate(
      userId,
      { userRole: UserRoles.User, userPermissions: [], parentCreator: null },
    );
    if (!updatedUser) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to demote user",
      );
    }
    return updatedUser;
  }

  async getPortalUsers(
    userRole: UserRoles,
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; data: IPortalUserDocument[] }> {
    const users = await this.PortalUserRepository.getPortalUsers(
      userRole,
      query,
    );
    return users;
  }

  async getPortalChildUsers(
    userRole: UserRoles,
    parentId: string,
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; data: IPortalUserDocument[] }> {
    const users = await this.PortalUserRepository.getPortalChildUsers(
      userRole,
      parentId,
      query,
    );
    return users;
  }

  async getHosts(
    parentId: string,
    query: Record<string, any>,
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
    }: { accountNumber: string; accountType: string; totalSalary: number },
  ): Promise<IAgencyWithdrawDocument> {
    // checking for previous withdraw
    const existingWithdraw =
      await this.AgencyWithdrawRepository.getWithdrawWithStatus(
        id,
        StatusTypes.pending,
      );
    if (existingWithdraw)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "You have already applied for withdraw",
      );
    await this.SalaryRepository.getSalaryByAmount(totalSalary);
    // getting my profile info
    const myProfile = await this.PortalUserRepository.getPortalUserById(id);
    // checking eligibiility for withdraw
    if (myProfile?.diamonds! < totalSalary)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `your exisitng fund ${myProfile?.diamonds} is not sufficient for ${totalSalary} to withdraw`,
      );

    const session = await mongoose.startSession();
    session.startTransaction();

    const update = await this.PortalUserRepository.updateDiamonds(
      id,
      -totalSalary,
      session,
    );
    if (!update)
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to update diamonds",
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
      session,
    );
    if (!withdraw)
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to create withdraw",
      );
    await session.commitTransaction();
    session.endSession();
    return withdraw;
  }

  async getAgencyWithdrawList(
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; data: IAgencyWithdrawDocument[] }> {
    return await this.AgencyWithdrawRepository.getAgencyWithdrawlist(query);
  }

  async getAllAgencyList(
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; data: IPortalUserDocument[] }> {
    const res = await this.PortalUserRepository.getAllAgency(query);
    return res;
  }
  async deleteAgency(agencyId: string): Promise<IPortalUserDocument> {
    const profile = await this.PortalUserRepository.getPortalUserById(agencyId);
    if (!profile)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `id -> ${agencyId} does not exist`,
      );
    if (profile.userRole != UserRoles.Agency)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `${agencyId} belongs to ${profile.userRole} not to an agency`,
      );
    const hostCount = await this.UserRepository.getHostCounts(agencyId);
    if (hostCount != 0)
      throw new AppError(
        StatusCodes.CONFLICT,
        `${profile.name} has ${hostCount} hosts, so cannot be deleted untill host count is 0`,
      );
    const deletedAgency =
      await this.PortalUserRepository.deletePortalUser(agencyId);
    return deletedAgency;
  }
  async getAllJoinRequest(
    myId: string,
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; data: IAgencyJoinRequest[] }> {
    return await this.AgencyJoinRequestRepository.getRequests(myId, query);
  }

  async updateJoinRequestStatus(
    reqId: string,
    status: StatusTypes,
  ): Promise<{ status: StatusTypes }> {
    const request =
      await this.AgencyJoinRequestRepository.getRequestById(reqId);
    if (!request)
      throw new AppError(StatusCodes.NOT_FOUND, "Request not found");
    if (status == StatusTypes.rejected) {
      await this.AgencyJoinRequestRepository.deleteRequest(reqId);
      return { status: StatusTypes.rejected };
    }
    if (status == StatusTypes.accepted) {
      await this.UserRepository.findUserByIdAndUpdate(
        request.userId as string,
        {
          userRole: UserRoles.Host,
          parentCreator: request.agencyId,
        },
      );
    }
    const update = await this.AgencyJoinRequestRepository.updateRequest(reqId, {
      status,
    });
    return { status: update.status! };
  }
}
