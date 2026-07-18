/**
 * App Reseller Service
 *
 * Handles business logic for the app reseller feature. An "app reseller" is a
 * regular app user (stored in the `users` collection) whose `userRole` has been
 * promoted to `"re-seller"`. They are distinct from portal users.
 *
 * Responsibilities:
 *   - Promote/demote users between "user" and "re-seller" roles
 *   - List all resellers (paginated)
 *   - Allow resellers to transfer coins from their own balance to any app user
 */

import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import AppError from "../../core/errors/app_errors";
import { AdminPowers, UserRoles } from "../../core/Utils/enums";
import { IUserRepository } from "../../repository/users/user_repository";
import { IPagination } from "../../core/Utils/query_builder";
import { IUserDocument } from "../../models/user/user_model_interface";
import IUserStatsRepository from "../../repository/users/userstats_repository_interface";
import { ICoinHistoryRepository } from "../../repository/coins/coinHistoryRepository";
import { ICoinHistory } from "../../models/coins/coinHistoryModel";
import { ICoinHistoryDocument } from "../../models/coins/coinHistoryModel";
import { ILevelTagBgRepository } from "../../repository/users/level_tag_bg_repository";
import {
  canUserUpdate,
} from "../../core/Utils/helper_functions";
import { IReferralService } from "../referral/referral_service";
import { IAdminRepository } from "../../repository/admin/admin_repository";
import { IPortalUserRepository } from "../../repository/portal_user/portal_user_repository";
import { creditRegularUserCoins } from "../coin/coin_utils";

// ────────────────────────────────────────────────────────────────────────────
// Interface
// ────────────────────────────────────────────────────────────────────────────

export interface IAppResellerService {
  /**
   * Change a user's role to/from "user" and "re-seller".
   * Only Admin / SubAdmin can call this.
   */
  updateUserRole(
    userId: string,
    newRole: UserRoles,
  ): Promise<{ id: string; userRole: string }>;

  /**
   * Retrieve all users whose role is "re-seller", with pagination.
   */
  getAllResellers(
    query: Record<string, unknown>,
  ): Promise<{
    pagination: IPagination;
    users: IUserDocument[];
  }>;

  /**
   * Transfer coins from a reseller's wallet to a target user.
   * The reseller is an **app user** (not a portal user) so their coins are
   * stored in the `UserStats` collection — the same collection as the target.
   *
   * @param resellerId - _id of the reseller (app user performing the transfer)
   * @param userId     - _id of the target app user receiving the coins
   * @param coins      - amount to transfer (must be a positive integer)
   * @returns Updated coin balances for both sender and receiver
   */
  giveCoinsToUser(
    resellerId: string,
    userId: string,
    coins: number,
  ): Promise<{
    sender: { id: string; coins: number };
    receiver: { id: string; coins: number };
  }>;

  /**
   * Transfer coins from an Admin or SubAdmin to a reseller (app user).
   * 
   * Admin's coins are stored in the `admins` collection.
   * SubAdmin's coins are stored in the `portal_users` collection.
   * The reseller's coins are stored in the `UserStats` collection.
   *
   * @param senderId   - _id of the Admin or SubAdmin (from JWT)
   * @param senderRole - role of the sender (Admin or SubAdmin)
   * @param resellerId - _id of the target reseller receiving the coins
   * @param coins      - amount to transfer (must be a positive integer)
   * @returns Updated coin balances for both sender and receiver
   */
  giveCoinsToReseller(
    senderId: string,
    senderRole: UserRoles,
    resellerId: string,
    coins: number,
  ): Promise<{
    sender: { id: string; coins: number };
    receiver: { id: string; coins: number };
  }>;

  getCoinHistory(
    resellerId: string,
    query: Record<string, unknown>,
  ): Promise<{ pagination: IPagination; data: ICoinHistoryDocument[] }>;
}


// ────────────────────────────────────────────────────────────────────────────
// Implementation
// ────────────────────────────────────────────────────────────────────────────

export default class AppResellerService implements IAppResellerService {
  // ── Dependencies ────────────────────────────────────────────────────────────
  UserRepository: IUserRepository;
  UserStatsRepository: IUserStatsRepository;
  CoinHistoryRepository: ICoinHistoryRepository;
  LevelTagBgRepository: ILevelTagBgRepository;
  ReferralService: IReferralService;
  AdminRepository: IAdminRepository;
  PortalUserRepository: IPortalUserRepository;

  constructor(
    UserRepository: IUserRepository,
    UserStatsRepository: IUserStatsRepository,
    CoinHistoryRepository: ICoinHistoryRepository,
    LevelTagBgRepository: ILevelTagBgRepository,
    ReferralService: IReferralService,
    AdminRepository: IAdminRepository,
    PortalUserRepository: IPortalUserRepository,
  ) {
    this.UserRepository = UserRepository;
    this.UserStatsRepository = UserStatsRepository;
    this.CoinHistoryRepository = CoinHistoryRepository;
    this.LevelTagBgRepository = LevelTagBgRepository;
    this.ReferralService = ReferralService;
    this.AdminRepository = AdminRepository;
    this.PortalUserRepository = PortalUserRepository;
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  getAllResellers
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Fetches paginated list of app users whose role is `"re-seller"`.
   * Delegates to `UserRepository.getUserByRole()` which uses the QueryBuilder
   * internally to support `page`, `limit`, `searchTerm`, etc.
   */
  async getAllResellers(
    query: Record<string, unknown>,
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }> {
    return this.UserRepository.getUserByRole(UserRoles.Reseller, query);
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  updateUserRole
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Updates an app user's role. The role can only be toggled between
   * `"user"` and `"re-seller"` — no other roles are permitted.
   *
   * Validation steps:
   *   1. `newRole` must be either `"user"` or `"re-seller"`
   *   2. The target user must exist
   *   3. The target's current role must also be one of the two allowed values
   *   4. Rejects no-op requests (role is already the requested value)
   *
   * @throws AppError(400) if the role is invalid or the user is already that role
   * @throws AppError(404) if the user is not found
   */
  async updateUserRole(
    userId: string,
    newRole: UserRoles,
  ): Promise<{ id: string; userRole: string }> {
    // ── 1. Validate the target role ──────────────────────────────────────────
    const allowedRoles = [UserRoles.User, UserRoles.Reseller];
    if (!allowedRoles.includes(newRole)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Role can only be changed to "${UserRoles.User}" or "${UserRoles.Reseller}"`,
      );
    }

    // ── 2. Fetch the user ─────────────────────────────────────────────────────
    const user = await this.UserRepository.findUserById(userId);
    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    // ── 3. Ensure the user's current role is also one of the allowed values ───
    if (!allowedRoles.includes(user.userRole as UserRoles)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Cannot change role for users with role "${user.userRole}"`,
      );
    }

    // ── 4. Prevent no-op updates ──────────────────────────────────────────────
    if (user.userRole === newRole) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `User already has the role "${newRole}"`,
      );
    }

    // ── 5. Persist the change ─────────────────────────────────────────────────
    const updatedUser = await this.UserRepository.findUserByIdAndUpdate(userId, {
      userRole: newRole,
    });

    if (!updatedUser) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to update user role",
      );
    }

    return {
      id: updatedUser._id as string,
      userRole: updatedUser.userRole as string,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  giveCoinsToUser
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Transfers coins from a reseller (app user) to another app user.
   *
   * **Key design decisions:**
   * - The reseller is an **app user**, NOT a portal user. Their coin balance
   *   lives in the `UserStats` collection (same as the target).
   * - Deduction uses `UserStatsRepository.balanceDeduction()`, which
   *   atomically checks `coins >= amount` before deducting.
   * - Addition uses `UserStatsRepository.updateCoins()` for a simple increment.
   * - The entire transfer is wrapped in a MongoDB transaction so that either
   *   both the deduction AND the addition succeed, or neither does.
   * - A coin history record is created for audit purposes.
   *
   * @throws AppError(400) if coins <= 0
   * @throws AppError(400) if the reseller has insufficient reseller coins
   * @throws AppError(404) if either user is not found
   * @throws AppError(401) if the sender is not a reseller
   */
  async giveCoinsToUser(
    resellerId: string,
    userId: string,
    coins: number,
  ): Promise<{
    sender: { id: string; coins: number };
    receiver: { id: string; coins: number };
  }> {
    // ── 1. Validate inputs ──────────────────────────────────────────────────
    if (!coins || coins <= 0) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Coins must be greater than 0",
      );
    }



    // ── 2. Verify the sender exists and has the "re-seller" role ────────────
    //      The reseller is fetched from the regular app users collection.
    const reseller = await this.UserRepository.findUserById(resellerId);
    if (!reseller) {
      throw new AppError(StatusCodes.NOT_FOUND, "Reseller not found");
    }
    if (reseller.userRole !== UserRoles.Reseller) {
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        "Only resellers can perform this action",
      );
    }

    // ── 3. Verify the target user exists ─────────────────────────────────────
    const targetUser = await this.UserRepository.findUserById(userId);
    if (!targetUser) {
      throw new AppError(StatusCodes.NOT_FOUND, "Target user not found");
    }

    // ── 4. Execute the transfer inside a MongoDB transaction ────────────────
    //      Purpose: if either the deduction or the addition fails, ALL changes
    //      are rolled back so the system is never left in an inconsistent state.
    const session = await mongoose.startSession();
    session.startTransaction();

    let updatedSender: { id: string; coins: number };
    let updatedReceiver: { id: string; coins: number };

    try {
      // 4a. Deduct coins from the reseller's resellerCoin field.
      //      `resellerCoinDeduction` internally checks `resellerCoin >= amount`
      //      so this will throw "not enough reseller coins" if the balance is low.
      const senderAfterDeduction =
        await this.UserStatsRepository.resellerCoinDeduction(
          resellerId,
          coins,
          session,
        );

      // TypeScript safety guard — `resellerCoinDeduction` is typed as nullable
      // but in practice always throws on failure rather than returning null.
      if (!senderAfterDeduction) {
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to deduct reseller coins",
        );
      }

      // 4b. Credit the receiver using the shared utility (updates coins, level, and history).
      const receiverStats = await creditRegularUserCoins({
        userId,
        coins,
        targetUser,
        userRepository: this.UserRepository,
        userStatsRepository: this.UserStatsRepository,
        levelTagBgRepository: this.LevelTagBgRepository,
        coinHistoryRepository: this.CoinHistoryRepository,
        senderRole: UserRoles.Reseller,
        senderId: resellerId,
        receiverRole: UserRoles.User,
        session,
      });

      // 4e. Commit — all operations above are now permanent.
      await session.commitTransaction();

      // Build the return object with the updated balances.
      updatedSender = {
        id: resellerId,
        coins: senderAfterDeduction.resellerCoin ?? 0,
      };
      updatedReceiver = {
        id: userId,
        coins: receiverStats.coins ?? 0,
      };
    } catch (error) {
      // If anything went wrong, roll back every change made in this session.
      await session.abortTransaction();
      throw error;
    } finally {
      // Always release the session resources, regardless of success or failure.
      session.endSession();
    }

    // ── 5. Referral recharge hook (fire-and-forget) ──────────────────────────
    //      If the target user was referred by someone, the referrer may receive
    //      a milestone reward based on the cumulative recharge amount.
    //      This runs outside the transaction so a referral failure never rolls
    //      back the coin transfer.
    try {
      await this.ReferralService.handleRechargeReferral(userId, coins);
    } catch (error) {
      console.error("Referral recharge tracking failed:", error);
    }

    return {
      sender: updatedSender,
      receiver: updatedReceiver,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  giveCoinsToReseller
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Transfers coins from an Admin or SubAdmin to a reseller (app user).
   *
   * **Key design decisions:**
   * - Admin's coins are stored in the `admins` collection.
   * - SubAdmin's coins are stored in the `portal_users` collection.
   * - The reseller is an **app user** with role `"re-seller"`. Their coin
   *   balance lives in the `UserStats` collection.
   * - The transfer is wrapped in a MongoDB transaction so that either both
   *   the deduction AND the addition succeed, or neither does.
   * - A coin history record is created for audit purposes.
   *
   * @throws AppError(400) if coins <= 0 or the sender tries self-transfer
   * @throws AppError(400) if the sender has insufficient coins
   * @throws AppError(404) if the reseller is not found
   * @throws AppError(401) if the sender is not an Admin or SubAdmin
   */
  async giveCoinsToReseller(
    senderId: string,
    senderRole: UserRoles,
    resellerId: string,
    coins: number,
  ): Promise<{
    sender: { id: string; coins: number };
    receiver: { id: string; coins: number };
  }> {
    // ── 1. Validate inputs ──────────────────────────────────────────────────
    if (!coins || coins <= 0) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Coins must be greater than 0",
      );
    }

    // Only Admin and SubAdmin are allowed to use this endpoint
    const allowedSenders = [UserRoles.Admin, UserRoles.SubAdmin];
    if (!allowedSenders.includes(senderRole)) {
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        `"${senderRole}" is not authorized to give coins to resellers`,
      );
    }

    if (senderId === resellerId) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Self-transfer is not allowed",
      );
    }

    // ── 2. Verify the sender exists and has the expected role ───────────────
    let senderProfile;
    if (senderRole === UserRoles.Admin) {
      senderProfile = await this.AdminRepository.getAdminById(senderId);
    } else {
      senderProfile = await this.PortalUserRepository.getPortalUserById(senderId);
    }

    if (!senderProfile) {
      throw new AppError(StatusCodes.NOT_FOUND, "Sender not found");
    }
    if (senderProfile.userRole !== senderRole) {
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        `Sender role mismatch: expected "${senderRole}", found "${senderProfile.userRole}"`,
      );
    }

    // ── 3. For SubAdmin, verify coin-distributor permission ─────────────────
    if (senderRole === UserRoles.SubAdmin) {
      const hasPermission = canUserUpdate(senderProfile, [
        AdminPowers.CoinDistribute,
      ]);
      if (!hasPermission) {
        throw new AppError(
          StatusCodes.UNAUTHORIZED,
          "You do not have the coin-distributor permission to assign coins",
        );
      }
    }

    // ── 4. Verify the target reseller exists and has the "re-seller" role ────
    const reseller = await this.UserRepository.findUserById(resellerId);
    if (!reseller) {
      throw new AppError(StatusCodes.NOT_FOUND, "Reseller not found");
    }
    if (reseller.userRole !== UserRoles.Reseller) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Target user is not a reseller (role: "${reseller.userRole}")`,
      );
    }

    // ── 4. Execute the transfer inside a MongoDB transaction ────────────────
    const session = await mongoose.startSession();
    session.startTransaction();

    let updatedSender: { id: string; coins: number };
    let updatedReceiver: { id: string; coins: number };

    try {
      // 4a. Deduct coins from the sender's balance.
      //     Both AdminRepository.updateCoin and PortalUserRepository.updateCoin
      //     atomically check `coins >= amount` before deducting.
      if (senderRole === UserRoles.Admin) {
        const adminAfterDeduction = await this.AdminRepository.updateCoin(
          senderId,
          -coins,
          session,
        );
        updatedSender = {
          id: senderId,
          coins: adminAfterDeduction.coins ?? 0,
        };
      } else {
        const subAdminAfterDeduction =
          await this.PortalUserRepository.updateCoin(
            senderId,
            -coins,
            session,
          );
        updatedSender = {
          id: senderId,
          coins: subAdminAfterDeduction.coins ?? 0,
        };
      }

      // 4b. Add the same amount of coins to the reseller's resellerCoin field.
      const receiverStats = await this.UserStatsRepository.updateResellerCoins(
        resellerId,
        coins,
        session,
      );

      // 4d. Persist an audit record so we can trace who gave coins to whom.
      const historyObj: ICoinHistory = {
        senderRole: senderRole,
        senderId: senderId,
        receiverRole: UserRoles.Reseller,
        receiverId: resellerId,
        amount: coins,
      };
      await this.CoinHistoryRepository.createHistory(historyObj, session);

      // 4e. Commit — all operations above are now permanent.
      await session.commitTransaction();

      updatedReceiver = {
        id: resellerId,
        coins: receiverStats.resellerCoin ?? 0,
      };
    } catch (error) {
      // If anything went wrong, roll back every change made in this session.
      await session.abortTransaction();
      throw error;
    } finally {
      // Always release the session resources, regardless of success or failure.
      session.endSession();
    }

    return {
      sender: updatedSender,
      receiver: updatedReceiver,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  getCoinHistory
  // ──────────────────────────────────────────────────────────────────────────

  async getCoinHistory(
    resellerId: string,
    query: Record<string, unknown>,
  ): Promise<{ pagination: IPagination; data: ICoinHistoryDocument[] }> {
    const reseller = await this.UserRepository.findUserById(resellerId);
    if (!reseller || reseller.userRole !== UserRoles.Reseller) {
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        "Only resellers can view this history",
      );
    }
    return this.CoinHistoryRepository.getResellerHistories(resellerId, query);
  }
}
