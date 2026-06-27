import { IFamily, IFamilyDocument } from "../../models/family/family_model";
import { RepositoryProviders } from "../../core/providers/repository_providers";
import { IFamilyRepository } from "../../repository/family/family_repository";
import { IFamilyMemberRepository } from "../../repository/family/family_member_repository";
import {
  FamilyMemberRole,
  FamilyJoinMode,
  StatusTypes,
} from "../../core/Utils/enums";
import { UserCache } from "../../core/cache/user_chache";
import AppError from "../../core/errors/app_errors";
import { StatusCodes } from "http-status-codes";
import { XpHelper } from "../../core/helper_classes/xp_helper";
import { IUserRepository } from "../../repository/users/user_repository";
import IUserStatsRepository from "../../repository/users/userstats_repository_interface";
import {
  IFamilyJoinRequestDocument,
  IFamilyJoinRequest,
} from "../../models/family/family_join_request_model";
import { IFamilyJoinRequestRepository } from "../../repository/family/family_join_request_repository";
import { isValidMongooseToken } from "../../core/Utils/helper_functions";
import mongoose from "mongoose";

import {
  FAMILY_CREATE_PRICE,
  FAMILY_UPDATE_PRICE,
} from "../../core/Utils/constants";
import {
  IFamilyMember,
  IFamilyMemberDocument,
} from "../../models/family/family_member_model";
import {
  GiftRecordRepository,
  IGiftRecordRepository,
} from "../../repository/gifts/gift_record_repository";
import { DateHelper } from "../../core/helper_classes/date_helper";

// Simple in-memory cache with TTL for family ranking
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class FamilyRankingCache {
  private static instance: FamilyRankingCache | null = null;
  private cache = new Map<string, CacheEntry<any>>();
  private readonly TTL = 30 * 1000; // 30 seconds

  private constructor() {}

  static getInstance(): FamilyRankingCache {
    if (!FamilyRankingCache.instance) {
      FamilyRankingCache.instance = new FamilyRankingCache();
    }
    return FamilyRankingCache.instance;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && entry.expiry > Date.now()) return entry.data as T;
    this.cache.delete(key);
    return null;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, expiry: Date.now() + this.TTL });
  }

  invalidate(): void {
    this.cache.clear();
  }
}

export interface IFamilyJoinStatus {
  status: "joined" | "pending" | "none";
  familyId: string | null;
  familyName?: string;
}

export interface IFamilyJoinResult {
  family: IFamilyDocument;
  status: "joined" | "pending";
}

export interface IFamilyRankingEntry {
  familyId: string;
  familyName: string;
  familyCoverPhoto: string;
  totalContribution: number;
  leader: {
    memberId: string;
    memberName: string;
    memberPhoto: string;
  };
}

export interface IFamilyRankingResult {
  top1FamilyDetails: IFamilyRankingEntry | null;
  ranking: IFamilyRankingEntry[];
}

export interface IThisWeekFamilyRankingResult extends IFamilyRankingResult {
  weekEnd: Date;
}

export interface IFamilyDetails {
  family: IFamilyDocument;
  topContributors: IFamilyMemberDocument[];
  featuredMembers: IFamilyMemberDocument[];
  rewardProgress: {
    currentWeeklyContribution: number;
    nextLevel: number | null;
    nextLevelTarget: number | null;
  };
}

export interface IFamilyService {
  createFamily(data: IFamily): Promise<IFamilyDocument>;
  updateFamilyInformation(
    myId: string,
    data: Partial<IFamily>,
  ): Promise<IFamilyDocument>;
  getFamilyJoinStatus(userId: string): Promise<IFamilyJoinStatus>;
  getFamilyJoinRequests(userId: string): Promise<IFamilyJoinRequestDocument[]>;
  approveFamilyJoinRequest(
    userId: string,
    requestId: string,
  ): Promise<IFamilyJoinRequestDocument>;
  rejectFamilyJoinRequest(
    userId: string,
    requestId: string,
  ): Promise<IFamilyJoinRequestDocument>;
  joinFamily(userId: string, familyId: string): Promise<IFamilyJoinResult>;
  changeMemberRole(
    callerId: string,
    memberId: string,
    newRole: FamilyMemberRole,
  ): Promise<IFamilyMemberDocument>;
  leaveFamily(userId: string): Promise<void>;
  kickMember(callerId: string, memberId: string): Promise<void>;
  getLastWeekRanking(): Promise<IFamilyRankingResult>;
  getThisWeekRanking(): Promise<IThisWeekFamilyRankingResult>;
  getFamilyDetails(familyId: string): Promise<IFamilyDetails>;
}

export class FamilyService implements IFamilyService {
  familyRepository: IFamilyRepository =
    RepositoryProviders.familyRepositoryProvider;
  familyMemberRepository: IFamilyMemberRepository =
    RepositoryProviders.familyMemberRepositoryProvider;
  userRepository: IUserRepository = RepositoryProviders.userRepositoryProvider;
  userStatsRepository: IUserStatsRepository =
    RepositoryProviders.userStatsRepositoryProvider;
  familyJoinRequestRepository: IFamilyJoinRequestRepository =
    RepositoryProviders.familyJoinRequestRepositoryProvider;
  GiftRecordRepository: IGiftRecordRepository =
    RepositoryProviders.giftRecordRepositoryProvider;
  familySupportRewardRepository =
    RepositoryProviders.familySupportRewardRepositoryProvider;

  async createFamily(data: IFamily): Promise<IFamilyDocument> {
    //step1: validate leaderId
    const leader = await UserCache.getInstance().getUserBrief(
      data.leaderId.toString(),
    );
    if (!leader) throw new AppError(StatusCodes.NOT_FOUND, "Leader not found");
    //step2: check if user already has a family
    const family = await this.familyRepository.getByLeaderId(
      data.leaderId.toString(),
    );
    if (family || leader.familyId)
      throw new AppError(StatusCodes.BAD_REQUEST, "Family already exists");
    //step3: check if the leader (creator) has required level -> 5
    if (leader.level < 5)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Leader does not have required level",
      );
    //step4: get the highest svip level of the user
    const highestSvip = await XpHelper.getInstance().getHighestSvipLevel(
      data.leaderId.toString(),
    );

    //step5: execute financial & state mutations inside a transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // step5a: if no svip or svip is less than 4 then deduct the balance from the user
      if (highestSvip < 4) {
        await this.userStatsRepository.balanceDeduction(
          data.leaderId.toString(),
          FAMILY_CREATE_PRICE,
          session,
        );
      }
      //step5b: create family
      const newFamily = await this.familyRepository.create(data, session);
      //step5c: make the leader to be the first member
      const familyMember: IFamilyMember = {
        familyId: newFamily._id as string,
        userId: data.leaderId,
        role: FamilyMemberRole.Leader,
      };
      await Promise.all([
        this.familyMemberRepository.create(familyMember, session),
        this.userRepository.findUserByIdAndUpdate(
          data.leaderId.toString(),
          { familyId: newFamily._id as string },
          session,
        ),
      ]);
      await session.commitTransaction();
      return newFamily;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async updateFamilyInformation(
    myId: string,
    data: Partial<IFamily>,
  ): Promise<IFamilyDocument> {
    //step 1: fetch the family by leaderId
    const family = await this.familyRepository.getByLeaderId(myId);
    //step 2: check if family exists and if user is really the leader
    if (!family)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        "Family not found or you are not the leader",
      );

    //step 3: collect updated data - add non-empty allowed fields only
    const updatedData: Partial<IFamily> = {};
    if (data.name) updatedData.name = data.name;
    if (data.introduction) updatedData.introduction = data.introduction;
    if (data.coverPhoto) updatedData.coverPhoto = data.coverPhoto;
    if (data.joinMode) updatedData.joinMode = data.joinMode;
    if (data.minLevel !== undefined) updatedData.minLevel = data.minLevel;
    if (data.memberLimit !== undefined)
      updatedData.memberLimit = data.memberLimit;

    if (Object.keys(updatedData).length === 0) {
      throw new AppError(StatusCodes.BAD_REQUEST, "No valid field to update");
    }

    //step 4: execute payment + update inside a transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // step 4a: check last update time (once a week allowed for free)
      const now = new Date();
      const lastUpdate = family.lastUpdatedAt
        ? new Date(family.lastUpdatedAt)
        : new Date(0);
      const msInWeek = 7 * 24 * 60 * 60 * 1000;

      if (now.getTime() - lastUpdate.getTime() < msInWeek) {
        // Less than a week since last update, must pay
        await this.userStatsRepository.balanceDeduction(
          myId,
          FAMILY_UPDATE_PRICE,
          session,
        );
      }

      //step 4b: perform update
      updatedData.lastUpdatedAt = now;
      const updatedFamily = await this.familyRepository.update(
        family._id as string,
        updatedData,
        session,
      );

      if (!updatedFamily) {
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to update family",
        );
      }

      await session.commitTransaction();
      return updatedFamily;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async joinFamily(
    userId: string,
    familyId: string,
  ): Promise<IFamilyJoinResult> {
    //step1: validate userId and familyId
    if (!isValidMongooseToken(userId) || !isValidMongooseToken(familyId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid userId or familyId");
    }

    const [user, family, member, joinRequest] = await Promise.all([
      this.userRepository.findUserById(userId),
      this.familyRepository.getById(familyId),
      this.familyMemberRepository.getByUserId(userId), // checking if user is a member of any family
      this.familyJoinRequestRepository.getByUserId(userId), // checking if user has sent a join request to any family
    ]);

    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    if (!family) throw new AppError(StatusCodes.NOT_FOUND, "Family not found");
    if (joinRequest)
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "You have already sent a join request to a family",
      );

    //step2: check if user already member of another family
    if (user.familyId || member) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "User is already a member of a family",
      );
    }

    //step3: check minimum join level
    if (family.minLevel && user.level! < family.minLevel) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `At least level ${family.minLevel} is required to join this family`,
      );
    }

    //step4: check if user is already the leader of a family (edge case if cache/user doc out of sync)
    const familyAsLeader = await this.familyRepository.getByLeaderId(userId);
    if (familyAsLeader) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "User is already a leader of a family",
      );
    }

    //step5: check member limit
    if (
      family.memberCount &&
      family.memberLimit &&
      family.memberCount >= family.memberLimit
    ) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Family is full");
    }

    //step6: check for family join type
    if (family.joinMode === FamilyJoinMode.Free) {
      //simply create a family Member document and he joined
      const familyMember: IFamilyMember = {
        familyId: familyId,
        userId: userId,
        role: FamilyMemberRole.Member,
      };

      await Promise.all([
        this.familyMemberRepository.create(familyMember),
        this.userRepository.findUserByIdAndUpdate(userId, { familyId }),
        //step7: increment member count
        this.familyRepository.incrementMemberCount(familyId),
      ]);

      return { family, status: "joined" };
    } else if (family.joinMode === FamilyJoinMode.Approval) {
      //step8: check if request already exists
      const existingRequest = await this.familyJoinRequestRepository.findByUser(
        userId,
        familyId,
        StatusTypes.pending,
      );
      if (existingRequest) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          "Join request already pending",
        );
      }

      //step9: create the approval request
      await this.familyJoinRequestRepository.create({
        familyId,
        userId,
      });

      return { family, status: "pending" };
    }

    throw new AppError(StatusCodes.BAD_REQUEST, "Invalid join mode");
  }

  async getFamilyJoinRequests(
    userId: string,
  ): Promise<IFamilyJoinRequestDocument[]> {
    const user = await this.userRepository.findUserById(userId);
    if (!user || !user.familyId) return [];

    return await this.familyJoinRequestRepository.findAllByFamily(
      user.familyId as string,
      StatusTypes.pending,
    );
  }

  async approveFamilyJoinRequest(
    userId: string,
    requestId: string,
  ): Promise<IFamilyJoinRequestDocument> {
    //step1: validate requestId
    if (!isValidMongooseToken(requestId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid requestId");
    }
    // Step 2: Retrieve the join request to validate its existence and prepare for processing
    const request = await this.familyJoinRequestRepository.findById(requestId);
    if (!request) {
      throw new AppError(StatusCodes.NOT_FOUND, "Join request not found");
    }

    // step 3: Check leadership privileges - must be a leader or co-leader of the same family
    await this.checkLeadershipPrivileges(
      userId,
      request.familyId.toString(),
      "Only leader or co-leader can approve join requests",
    );

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { userId, familyId } = request;

      //step3: delete the request
      await this.familyJoinRequestRepository.delete(requestId, session);

      //step4: create family member and update user/family
      const familyMember: IFamilyMember = {
        familyId: familyId.toString(),
        userId: userId.toString(),
        role: FamilyMemberRole.Member,
      };

      await Promise.all([
        this.familyMemberRepository.create(familyMember, session),
        this.userRepository.findUserByIdAndUpdate(
          userId.toString(),
          { familyId: familyId.toString() },
          session,
        ),
        this.familyRepository.incrementMemberCount(
          familyId.toString(),
          1,
          session,
        ),
      ]);

      await session.commitTransaction();
      return request;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async rejectFamilyJoinRequest(
    userId: string,
    requestId: string,
  ): Promise<IFamilyJoinRequestDocument> {
    //step1: check if the request with the id actually exists
    const request = await this.familyJoinRequestRepository.findById(requestId);
    if (!request) {
      throw new AppError(StatusCodes.NOT_FOUND, "Join request not found");
    }

    //step2: check for authorize the caller - must be a leader or co-leader of the same family
    await this.checkLeadershipPrivileges(
      userId,
      request.familyId.toString(),
      "Only leader or co-leader can reject join requests",
    );

    //step3: delete the request
    await this.familyJoinRequestRepository.delete(requestId);

    return request;
  }

  async getFamilyJoinStatus(userId: string): Promise<IFamilyJoinStatus> {
    if (!isValidMongooseToken(userId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid userId");
    }

    // 1. Check if user is already a member of a family
    const member = await this.familyMemberRepository.getByUserId(userId);
    if (member) {
      const family = await this.familyRepository.getById(
        member.familyId.toString(),
      );
      return {
        status: "joined",
        familyId: family?._id?.toString() || null,
        familyName: family?.name,
      };
    }

    // 2. Check if user has a join request
    const request = await this.familyJoinRequestRepository.getByUserId(userId);
    if (request) {
      const family = await this.familyRepository.getById(
        request.familyId.toString(),
      );
      return {
        status: "pending",
        familyId: family?._id?.toString() || null,
        familyName: family?.name,
      };
    }

    // 3. Neither found
    return {
      status: "none",
      familyId: null,
    };
  }

  async changeMemberRole(
    callerId: string,
    memberId: string,
    newRole: FamilyMemberRole,
  ): Promise<IFamilyMemberDocument> {
    //step 0: validate inputs
    if (!isValidMongooseToken(memberId) || !isValidMongooseToken(callerId)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Invalid member or caller ID",
      );
    }

    //step0b: verify caller still exists as a registered user
    const callerUser = await this.userRepository.findUserById(callerId);
    if (!callerUser) {
      throw new AppError(StatusCodes.NOT_FOUND, "Caller not found");
    }

    //step1: check if newRole is allowed (cannot assign 'leader' role)
    const allowedRoles = [
      FamilyMemberRole.CoLeader,
      FamilyMemberRole.Elder,
      FamilyMemberRole.Member,
    ];

    if (!allowedRoles.includes(newRole)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Invalid role. Only Co-Leader, Elder, and Member roles can be assigned.",
      );
    }

    //step2: check if caller is the leader
    const caller = await this.familyMemberRepository.getByUserId(callerId);

    if (!caller || caller.role !== FamilyMemberRole.Leader) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Only the family leader can change member roles",
      );
    }

    //step3: fetch target member and verify family
    const targetMember =
      await this.familyMemberRepository.getByUserId(memberId);
    if (
      !targetMember ||
      targetMember.familyId.toString() !== caller.familyId.toString()
    ) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        "Member not found in your family",
      );
    }

    //step4: prevent changing leader role (the leader role is unique and handled via transfer)
    if (targetMember.role === FamilyMemberRole.Leader) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Cannot change the leader's role",
      );
    }

    //step5: catch redundant role assignment
    if (targetMember.role === newRole) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Member is already assigned the role: ${newRole}`,
      );
    }

    //step6: enforce role limits
    if (newRole === FamilyMemberRole.CoLeader) {
      // Use the newly added countByRole method in the repository
      const coLeaderCount = await this.familyMemberRepository.countByRole(
        caller.familyId,
        FamilyMemberRole.CoLeader,
      );
      if (coLeaderCount >= 5) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          "Maximum number of Co-Leaders (5) reached",
        );
      }
    }

    //step7: update role
    const updatedMember = await this.familyMemberRepository.update(memberId, {
      role: newRole,
    });

    if (!updatedMember) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to update member role",
      );
    }

    return updatedMember;
  }

  async leaveFamily(userId: string): Promise<void> {
    if (!isValidMongooseToken(userId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid userId");
    }

    const member = await this.familyMemberRepository.getByUserId(userId);
    if (!member) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "You are not a member of any family",
      );
    }

    if (member.role === FamilyMemberRole.Leader) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Leader cannot leave the family. Transfer leadership first.",
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await Promise.all([
        this.familyMemberRepository.delete(userId, session),
        this.userRepository.findUserByIdAndUpdate(
          userId,
          { familyId: null },
          session,
        ),
        this.familyRepository.incrementMemberCount(
          member.familyId.toString(),
          -1,
          session,
        ),
      ]);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async kickMember(callerId: string, memberId: string): Promise<void> {
    if (!isValidMongooseToken(callerId) || !isValidMongooseToken(memberId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid caller or member ID");
    }

    if (callerId === memberId) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "You cannot kick yourself. Use leave instead.",
      );
    }

    const caller = await this.familyMemberRepository.getByUserId(callerId);
    if (!caller) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "You are not a member of any family",
      );
    }

    if (
      caller.role !== FamilyMemberRole.Leader &&
      caller.role !== FamilyMemberRole.CoLeader
    ) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Only leader or co-leader can kick members",
      );
    }

    const target = await this.familyMemberRepository.getByUserId(memberId);
    if (
      !target ||
      target.familyId.toString() !== caller.familyId.toString()
    ) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        "Member not found in your family",
      );
    }

    if (target.role === FamilyMemberRole.Leader) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Cannot kick the family leader",
      );
    }

    if (
      caller.role === FamilyMemberRole.CoLeader &&
      target.role === FamilyMemberRole.CoLeader
    ) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Co-leader cannot kick another co-leader",
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await Promise.all([
        this.familyMemberRepository.delete(memberId, session),
        this.userRepository.findUserByIdAndUpdate(
          memberId,
          { familyId: null },
          session,
        ),
        this.familyRepository.incrementMemberCount(
          caller.familyId.toString(),
          -1,
          session,
        ),
      ]);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getLastWeekRanking(): Promise<IFamilyRankingResult> {
    const cache = FamilyRankingCache.getInstance();
    const cached = cache.get<IFamilyRankingResult>("lastWeek");
    if (cached) return cached;

    const ranking = await this.GiftRecordRepository.getFamilyRanking(true);
    const top1FamilyDetails = ranking.length > 0 ? ranking[0] : null;
    const result: IFamilyRankingResult = { top1FamilyDetails, ranking };
    cache.set("lastWeek", result);
    return result;
  }

  async getThisWeekRanking(): Promise<IThisWeekFamilyRankingResult> {
    const cache = FamilyRankingCache.getInstance();
    const cached = cache.get<IThisWeekFamilyRankingResult>("thisWeek");
    if (cached) return cached;

    const ranking = await this.GiftRecordRepository.getFamilyRanking(false);
    const top1FamilyDetails = ranking.length > 0 ? ranking[0] : null;
    const result: IThisWeekFamilyRankingResult = {
      top1FamilyDetails,
      weekEnd: DateHelper.getEndOfWeek(new Date()),
      ranking,
    };
    cache.set("thisWeek", result);
    return result;
  }

  async getFamilyDetails(familyId: string): Promise<IFamilyDetails> {
    const [family, topContributors] = await Promise.all([
      this.familyRepository.getById(familyId),
      this.familyMemberRepository.getTopContributors(familyId, 5),
    ]);

    if (!family) {
      throw new AppError(StatusCodes.NOT_FOUND, "Family not found");
    }

    const featuredMembers = await this.getFeaturedMembers(familyId);

    const currentWeeklyContribution =
      await this.GiftRecordRepository.getWeeklyContribution(familyId);

    const { nextLevel, nextLevelTarget } =
      await this.familySupportRewardRepository.getNextLevelInfo(
        currentWeeklyContribution,
      );

    return {
      family,
      topContributors,
      featuredMembers,
      rewardProgress: {
        currentWeeklyContribution,
        nextLevel,
        nextLevelTarget,
      },
    };
  }

  private async getFeaturedMembers(
    familyId: string,
  ): Promise<IFamilyMemberDocument[]> {
    const MAX_FEATURED = 5;
    const MAX_CO_LEADERS = 4;

    const leader = await this.familyMemberRepository.getLeader(familyId);
    const featured: IFamilyMemberDocument[] = leader ? [leader] : [];

    const coLeaderCount = await this.familyMemberRepository.countByRole(
      familyId,
      FamilyMemberRole.CoLeader,
    );

    const coLeaderSlotsNeeded = Math.min(
      MAX_CO_LEADERS,
      MAX_FEATURED - featured.length,
    );

    if (coLeaderCount > 0) {
      const shouldRandomize = coLeaderCount > coLeaderSlotsNeeded;
      const coLeaders = await this.familyMemberRepository.getMembersByRole(
        familyId,
        FamilyMemberRole.CoLeader,
        coLeaderSlotsNeeded,
        shouldRandomize,
      );
      featured.push(...coLeaders);
    }

    const memberSlotsRemaining = MAX_FEATURED - featured.length;

    if (memberSlotsRemaining > 0) {
      const members = await this.familyMemberRepository.getMembersByRole(
        familyId,
        FamilyMemberRole.Member,
        memberSlotsRemaining,
      );
      featured.push(...members);
    }

    return featured;
  }

  private async checkLeadershipPrivileges(
    userId: string,
    familyId: string,
    actionMessage: string,
  ): Promise<void> {
    const member = await this.familyMemberRepository.getByUserId(userId);
    if (
      !member ||
      member.familyId.toString() !== familyId.toString() ||
      (member.role !== FamilyMemberRole.Leader &&
        member.role !== FamilyMemberRole.CoLeader)
    ) {
      throw new AppError(StatusCodes.FORBIDDEN, actionMessage);
    }
  }
}
