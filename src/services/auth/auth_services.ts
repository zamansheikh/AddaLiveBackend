import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import {
  AgencyJoinStatus,
  CloudinaryFolder,
  SocketAudioChannels,
  SocketChannels,
  StatusTypes,
  StreamType,
  UserRoles,
  WhoCanTextMe,
  WithdrawAccountTypes,
} from "../../core/Utils/enums";
import { uploadFileToCloudinary } from "../../core/Utils/upload_file_cloudinary";
import { IUserEntity } from "../../entities/user_entity_interface";
import jwt from "jsonwebtoken";
import IUserStatsRepository from "../../repository/users/userstats_repository_interface";
import { Types, UpdateResult } from "mongoose";
import { IAuthService, IGiftUser } from "./auth_service_interface";
import { IUserDocument } from "../../models/user/user_model_interface";
import mongoose from "mongoose";
import { RtcRole, RtcTokenBuilder } from "agora-token";
import { IUserRepository } from "../../repository/users/user_repository";
import SocketServer from "../../core/sockets/socket_server";
import { IGiftRepository } from "../../repository/gifts/gifts_repositories";
import { IPostRepository } from "../../repository/posts/post_repository_interface";
import { IReelRepository } from "../../repository/reels/reels_interface";
import { IStoryRepository } from "../../repository/stories/story_repository_interface";
import { IPostReactionRepository } from "../../repository/posts/likes/post_reaction_repository_interface";
import { IPostCommentRepository } from "../../repository/posts/comments/post_commnet_repository_interface";
import { IReelReactionRepository } from "../../repository/reels/likes/reel_reaction_interface";
import { IReelCommentRepository } from "../../repository/reels/comments/reel_comments_interface";
import { IStoryReactionRepository } from "../../repository/stories/likes/story_reaction_repository_interface";
import { appendFile, existsSync } from "fs";
import { IUSerStatsDocument } from "../../entities/userstats/userstats_interface";
import { IRoomHistory } from "../../models/room/room_history_model";
import { IRoomHistoryRepository } from "../../repository/room/room_repository";
import {
  IWithdrawBonus,
  IWithdrawBonusDocument,
} from "../../models/room/withdraw_bonus_model";
import { IWithdrawBonusRepository } from "../../repository/room/withdraw_bonus_repository";
import { ISalaryRepository } from "../../repository/salary/salary_repository";
import {
  IAgencyJoinRequest,
  IAgencyJoinRequestDocument,
} from "../../models/request/agencyJoinRequset";
import { IAgencyJoinRequestRepository } from "../../repository/request/AgencyJoinRequestRepository";
import { IPortalUserRepository } from "../../repository/portal_user/portal_user_repository";
import { IMyBucketRepository } from "../../repository/store/my_bucket_repository";
import { IStoreCategoryRepository } from "../../repository/store/store_category_repository";
import { IStoreItem } from "../../models/store/store_item_model";
import {
  checkPremiumItem,
  getEquipedItemObjects,
  getNextSalaryDate,
} from "../../core/Utils/helper_functions";
import { IRoomBonusRecords } from "../../models/room/bonus_records_model";
import { IRoomBonusRecordsRepository } from "../../repository/room/room_bonus_records_repository";
import { IRoomMessage } from "../../core/sockets/interface/socket_interface";
import bcrypt from "bcrypt";

export default class AuthService implements IAuthService {
  UserRepository: IUserRepository;
  UserStatsRepository: IUserStatsRepository;
  GiftRepository: IGiftRepository;
  PostRepository: IPostRepository;
  PostReactionRepository: IPostReactionRepository;
  PostCommentRepository: IPostCommentRepository;
  ReelRepository: IReelRepository;
  ReelsReactionReposiory: IReelReactionRepository;
  ReelsCommentRepository: IReelCommentRepository;
  StoriesRepository: IStoryRepository;
  StoriesReactionRepository: IStoryReactionRepository;
  RoomHistoryRepository: IRoomHistoryRepository;
  WithDrawHistoryRepository: IRoomHistoryRepository;
  BonusRepository: IWithdrawBonusRepository;
  SalaryRepository: ISalaryRepository;
  AgencyJoinRequestRepository: IAgencyJoinRequestRepository;
  PortalUserRepository: IPortalUserRepository;
  BucketRepository: IMyBucketRepository;
  CategoryRepository: IStoreCategoryRepository;
  RoomBonusRecordsRepository: IRoomBonusRecordsRepository;

  constructor(
    UserRepository: IUserRepository,
    UserStatsRepository: IUserStatsRepository,
    GiftRepository: IGiftRepository,
    PostRepository: IPostRepository,
    PostReactionRepository: IPostReactionRepository,
    PostCommentRepository: IPostCommentRepository,
    ReelRepository: IReelRepository,
    ReelsReactionReposiory: IReelReactionRepository,
    ReelsCommentRepository: IReelCommentRepository,
    StoriesRepository: IStoryRepository,
    StoriesReactionRepository: IStoryReactionRepository,
    RoomHistoryRepository: IRoomHistoryRepository,
    WithDrawHistoryRepository: IRoomHistoryRepository,
    BonusRepository: IWithdrawBonusRepository,
    SalaryRepository: ISalaryRepository,
    AgencyJoinRequestRepository: IAgencyJoinRequestRepository,
    PortalUserRepository: IPortalUserRepository,
    BucketRepository: IMyBucketRepository,
    CategoryRepository: IStoreCategoryRepository,
    RoomBonusRecords: IRoomBonusRecordsRepository
  ) {
    this.UserRepository = UserRepository;
    this.UserStatsRepository = UserStatsRepository;
    this.GiftRepository = GiftRepository;
    this.PostRepository = PostRepository;
    this.PostReactionRepository = PostReactionRepository;
    this.PostCommentRepository = PostCommentRepository;
    this.ReelRepository = ReelRepository;
    this.ReelsReactionReposiory = ReelsReactionReposiory;
    this.ReelsCommentRepository = ReelsCommentRepository;
    this.StoriesRepository = StoriesRepository;
    this.StoriesReactionRepository = StoriesReactionRepository;
    this.RoomHistoryRepository = RoomHistoryRepository;
    this.WithDrawHistoryRepository = WithDrawHistoryRepository;
    this.BonusRepository = BonusRepository;
    this.SalaryRepository = SalaryRepository;
    this.AgencyJoinRequestRepository = AgencyJoinRequestRepository;
    this.PortalUserRepository = PortalUserRepository;
    this.BucketRepository = BucketRepository;
    this.CategoryRepository = CategoryRepository;
    this.RoomBonusRecordsRepository = RoomBonusRecords;
  }

  async registerWithGoogle(UserData: IUserEntity) {
    const existingUser = await this.UserRepository.findByUID(UserData.uid);
    const SECRET = process.env.JWT_SECRET || "jwt_secret";

    if (!existingUser) {
      UserData.userId = await this.UserRepository.getLatestUserId();
      const newUser = await this.UserRepository.create(UserData);
      // if a instance exists with this new _id that is a false data and is being purged.
      const stats = await this.UserStatsRepository.getUserStats(
        newUser._id as string
      );
      if (stats)
        await this.UserStatsRepository.deleteStats(newUser._id as string);
      const newStats = await this.UserStatsRepository.createUserstats({
        userId: new Types.ObjectId(newUser._id as string),
      });

      if (!newStats)
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "creating the user stats failed"
        );
      if (!newUser)
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "creating the user failed"
        );
      const userWithStats = newUser.toObject();
      userWithStats.stats = newStats;
      // console.log("new userstats", newStats);
      // console.log("new user modified", newUser);
      const token = jwt.sign(
        { id: newUser._id, role: newUser.userRole },
        SECRET
      );
      return { user: userWithStats, token };
    }

    let userStats = await this.UserStatsRepository.getUserStats(
      existingUser._id as string
    );
    // every user should have their respective stats created

    if (!userStats) {
      userStats = await this.UserStatsRepository.createUserstats({
        userId: existingUser._id as string,
      });
    }
    const userWithStats = existingUser.toObject();
    userWithStats.stats = userStats;
    const token = jwt.sign(
      {
        id: existingUser._id,
        role: existingUser.userRole,
        permissions: existingUser.userPermissions,
      },
      SECRET
    );
    return { user: userWithStats, token };
  }

  async loginWithEmailPassword(
    email: string,
    password: string
  ): Promise<{ user: IUserDocument; token: string }> {
    const existingUser = await this.UserRepository.findUserByEmail(email);
    if (!existingUser)
      throw new AppError(StatusCodes.NOT_FOUND, "user not found");
    if (!existingUser.password || existingUser.password == "")
      throw new AppError(
        StatusCodes.CONFLICT,
        "You have not set a password yet"
      );
    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (!isPasswordValid)
      throw new AppError(StatusCodes.BAD_REQUEST, "incorrect password");
    const SECRET = process.env.JWT_SECRET || "jwt_secret";
    let userStats = await this.UserStatsRepository.getUserStats(
      existingUser._id as string
    );
    // every user should have their respective stats created

    if (!userStats) {
      userStats = await this.UserStatsRepository.createUserstats({
        userId: existingUser._id as string,
      });
    }
    const userWithStats = existingUser.toObject();
    userWithStats.stats = userStats;
    const token = jwt.sign(
      {
        id: existingUser._id,
        role: existingUser.userRole,
        permissions: existingUser.userPermissions,
      },
      SECRET
    );
    return { user: userWithStats, token };
  }

  async retrieveMyDetails(id: string): Promise<IUserDocument | null> {
    const user = await this.UserRepository.findUserById(id);
    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "user not found");
    const userStats = await this.UserStatsRepository.getUserStats(id);
    const userWithStats = user.toObject();
    userWithStats.stats = userStats;
    userWithStats.equippedStoreItems = await getEquipedItemObjects(
      this.BucketRepository,
      this.CategoryRepository,
      id
    );
    return userWithStats;
  }

  async deleteMyAccount(id: string): Promise<IUserDocument | null> {
    const user = await this.UserRepository.findUserById(id);
    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "Invalid token");
    const deletedUserStats = await this.UserStatsRepository.deleteStats(id);
    const deletedReels = await this.ReelRepository.deleteUserReels(id);
    const deletedReelsComment =
      await this.ReelsCommentRepository.deleteUserComments(id);
    const deletedReelsReaction =
      await this.ReelsReactionReposiory.deleteUserReactions(id);

    const deletedPosts = await this.PostRepository.deleteUserPosts(id);
    const deletedPostComment =
      await this.PostCommentRepository.deleteUserComments(id);
    const deletePostReaction =
      await this.PostReactionRepository.deleteUserReaction(id);

    const deletedStories = await this.StoriesRepository.deleteUserStories(id);
    const deletedStoriesReaction =
      await this.StoriesReactionRepository.deleteUserReactions(id);

    if (
      !deletedUserStats ||
      !deletedReels ||
      !deletedReelsComment ||
      !deletedReelsReaction ||
      !deletedPosts ||
      !deletedPostComment ||
      !deletePostReaction ||
      !deletedStories ||
      !deletedStoriesReaction
    )
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "failed to delete user and associated data"
      );
    const deletedUser = await this.UserRepository.deleteUserById(id);
    if (!deletedUser)
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "failed to delete user, please try again later"
      );
    return deletedUser;
  }

  async retrieveUserDetails(id: string, myId: string) {
    const profile = await this.UserRepository.findUserById(id);
    const myProfile = await this.UserRepository.findUserById(id);
    if (!profile || !myProfile)
      throw new AppError(StatusCodes.NOT_FOUND, "Invalid user Id");
    let user = await this.UserRepository.getUserDetails({ Id: id, myId });
    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "user not found");
    (user as any).equippedStoreItems = await getEquipedItemObjects(
      this.BucketRepository,
      this.CategoryRepository,
      id
    );
    return user;
  }

  async updateProfile({
    id,
    profileData,
    avatar,
    coverPicture,
  }: {
    id: string;
    profileData: Partial<Record<string, any>>;
    avatar?: Express.Multer.File;
    coverPicture?: Express.Multer.File;
  }) {
    const user = await this.UserRepository.findUserById(id);
    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "user not found");
    const updatePayload: Record<string, any> = {};
    let profilePicUrl;
    if (avatar) {
      profilePicUrl = await uploadFileToCloudinary({
        isVideo: false,
        folder: CloudinaryFolder.UserPRofile,
        file: avatar,
      });
      updatePayload["avatar"] = profilePicUrl;
    }
    if (coverPicture) {
      const cover = await uploadFileToCloudinary({
        isVideo: false,
        folder: CloudinaryFolder.UserPRofile,
        file: coverPicture,
      });
      updatePayload["coverPicture"] = cover;
    }
    // Filter and add only valid keys from profileData
    for (const [key, value] of Object.entries(profileData)) {
      if (value !== undefined) {
        updatePayload[key] = value;
      }
    }
    if (Object.keys(updatePayload).length === 0) {
      throw new Error("No valid data provided for update.");
    }
    return this.UserRepository.findUserByIdAndUpdate(id, updatePayload);
  }

  async setMyPassword(
    id: string,
    password: string,
    newPassword: string
  ): Promise<IUserDocument> {
    const existingUser = await this.UserRepository.findUserById(id);
    if (!existingUser)
      throw new AppError(StatusCodes.NOT_FOUND, "user not found");
    if (
      existingUser.password &&
      existingUser.password != "" &&
      !(await bcrypt.compare( password, existingUser.password))
    )
      throw new AppError(StatusCodes.BAD_REQUEST, "incorrect password");

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    existingUser.password = hashedPassword;
    await existingUser.save();
    return existingUser;
  }

  async giftUser({
    targetUserIds,
    myId,
    roomId,
    giftId,
    qty,
  }: {
    targetUserIds: string[];
    myId: string;
    roomId: string;
    giftId: string;
    qty: number;
  }): Promise<UpdateResult> {
    const myUser = await this.UserRepository.findUserById(myId);
    // const userToGift = await this.UserRepository.findUserById(targetUserId);
    if (!myUser) throw new AppError(StatusCodes.NOT_FOUND, "user not found");

    const exisitngGift = await this.GiftRepository.getGiftById(giftId);
    if (!exisitngGift)
      throw new AppError(StatusCodes.NOT_FOUND, "gift not found");

    // to determine the hot gifts
    exisitngGift.sendCount! += qty;
    await exisitngGift.save();

    const mystats = await this.UserStatsRepository.getUserStats(myId);

    const totalPrice = exisitngGift.coinPrice * targetUserIds.length * qty;

    if (!mystats)
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "my stats not found"
      );

    // starting a new session for safe rollback
    if (mystats.coins! < totalPrice)
      throw new AppError(StatusCodes.BAD_REQUEST, "not enough coins");

    const hasMyId = targetUserIds.filter((id) => id == myId);
    const otherIds = targetUserIds.filter((id) => id != myId);

    let updateStats = {
      acknowledged: true,
      modifiedCount: 1,
      upsertedId: null,
      upsertedCount: 0,
      matchedCount: 1,
    } as UpdateResult;

    const session = await mongoose.startSession();
    session.startTransaction();

    mystats.coins! -= totalPrice;
    if (hasMyId.length > 0) mystats.diamonds! += exisitngGift.diamonds * qty;
    await mystats.save({ session });

    if (otherIds)
      updateStats = await this.UserStatsRepository.updateGiftDiamond(
        otherIds,
        exisitngGift.diamonds * qty
      );

    await session.commitTransaction();
    session.endSession();

    // sending the information to the frontend via socket
    const ioInstance = SocketServer.getInstance().getIO();

    SocketServer.getInstance().updateRoomCoin(
      roomId,
      exisitngGift.diamonds * qty,
      targetUserIds
    );

    SocketServer.getInstance().updateRoomRanking(
      roomId,
      myId,
      exisitngGift.diamonds * qty,
      targetUserIds
    );

    ioInstance.to(roomId).emit(SocketChannels.sendGift, {
      avatar: myUser.avatar,
      name: myUser.name,
      recieverIds: targetUserIds,
      diamonds: exisitngGift.diamonds,
      qty: qty,
      gift: exisitngGift,
    });

    ioInstance.to(roomId).emit(SocketAudioChannels.SentAudioGift, {
      avatar: myUser.avatar,
      name: myUser.name,
      recieverIds: targetUserIds,
      diamonds: exisitngGift.diamonds,
      qty: qty,
      gift: exisitngGift,
    });

    const firstRecievedUser = await this.UserRepository.findUserById(
      targetUserIds[0]
    );
    if (!firstRecievedUser)
      throw new AppError(StatusCodes.NOT_FOUND, "reciever not found");

    const message: IRoomMessage = {
      name: myUser.name as string,
      avatar: myUser.avatar as string,
      uid: myUser.uid as string,
      country: myUser.country as string,
      _id: myUser._id as string,
      text: `has gifted ${qty} ${exisitngGift.name} to ${
        firstRecievedUser.name
      } ${
        targetUserIds.length - 1 == 0
          ? ""
          : `and ${targetUserIds.length - 1} more`
      } `,
      currentBackground: myUser.currentLevelBackground as string,
      currentTag: myUser.currentLevelTag as string,
      currentLevel: myUser.level as number,
      equipedStoreItems: await getEquipedItemObjects(
        this.BucketRepository,
        this.CategoryRepository,
        myId
      ),
    };

    ioInstance.to(roomId).emit(SocketChannels.sendMessage, message);
    ioInstance.to(roomId).emit(SocketAudioChannels.SendMessage, {
      success: true,
      message: "",
      data: message,
    });

    if (!updateStats)
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "updating user stats failed"
      );

    if (hasMyId.length > 0 && otherIds.length > 0) {
      updateStats.matchedCount += 1;
      updateStats.modifiedCount += 1;
    }

    return updateStats;
  }

  // add
  async getDailyBonus(
    id: string,
    totalTime: number,
    type: StreamType
  ): Promise<{ bonus: number }> {
    // erasing all the previous data from yesterday
    await this.RoomHistoryRepository.resetRoomHistory();
    // checking if the host reached maximum bonus
    const isDone = await this.RoomHistoryRepository.getIsDone(id);

    // creating withdraw history
    const withdrawHistory =
      await this.WithDrawHistoryRepository.createRoomHistory({
        firstEligible: false,
        host: id,
        totalLive: totalTime,
        isDone: false,
        type: type,
      });

    if (type == StreamType.Audio) return { bonus: 0 };

    if (!withdrawHistory)
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Creating Withdraw History failed"
      );

    if (isDone)
      throw new AppError(
        StatusCodes.CONFLICT,
        "You have reached the maximum bonus for today"
      );
    const record: IRoomBonusRecords = {
      bonusDiamonds: 0,
      userId: id,
      expireAt: getNextSalaryDate(),
    };
    // checking the id validaty;
    const user = await this.UserRepository.findUserById(id);
    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "user not found");
    const isFrist = await this.RoomHistoryRepository.getEligibleRoom(id);
    if (isFrist) {
      const totalLiveSum = await this.RoomHistoryRepository.getNextEligible(
        id,
        isFrist.createdAt
      );
      if (totalLiveSum + totalTime < 50) {
        const newHistory = await this.RoomHistoryRepository.createRoomHistory({
          firstEligible: totalTime >= 50,
          host: id,
          totalLive: totalTime,
          type: type,
        });
        if (!newHistory)
          throw new AppError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            "Creating History failed"
          );

        return { bonus: 0 };
      } else {
        const newHistory = await this.RoomHistoryRepository.createRoomHistory({
          firstEligible: false,
          host: id,
          totalLive: totalTime,
          isDone: true,
          type: type,
        });
        if (!newHistory)
          throw new AppError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            "Creating History failed"
          );
        record.bonusDiamonds = 3000;
        await this.RoomBonusRecordsRepository.createRecord(record);
        return { bonus: 3000 };
      }
    } else {
      // if the first target is not achieved
      const newHistory = await this.RoomHistoryRepository.createRoomHistory({
        firstEligible: totalTime >= 50,
        host: id,
        totalLive: totalTime,
        type: type,
      });
      if (!newHistory)
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Creating History failed"
        );
      if (totalTime >= 50) {
        record.bonusDiamonds = 2000;
        await this.RoomBonusRecordsRepository.createRecord(record);
      }
      return { bonus: totalTime >= 50 ? 2000 : 0 };
    }
  }

  async withdrawBonus(data: {
    hostId: string;
    accountType: WithdrawAccountTypes;
    accountNumber: string;
    totalSalary: number;
  }): Promise<IWithdrawBonusDocument> {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed
    const date = today.getDate();
    const lastDate = new Date(year, month + 1, 0).getDate();
    if (date != 15 && date != lastDate)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `${date} is not salary day, 15th or the last day of the month`
      );

    const { hostId, accountType, accountNumber, totalSalary } = data;
    const host = await this.UserRepository.findUserById(hostId);
    if (!host) throw new AppError(StatusCodes.NOT_FOUND, "user not found");
    const bonus = await this.BonusRepository.getBonusDocument(hostId);
    if (bonus && bonus.createdAt.getDate() == date)
      throw new AppError(
        StatusCodes.CONFLICT,
        "You have already applied for bonus today"
      );
    const userstats = await this.UserStatsRepository.getUserStats(hostId);
    if (!userstats)
      throw new AppError(StatusCodes.NOT_FOUND, "user stats not found");
    const bonusDiamonds = await this.RoomBonusRecordsRepository.readTotalBonus(
      hostId
    );

    if (userstats.diamonds! + bonusDiamonds < totalSalary)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "not enough diamonds to withdraw"
      );

    const dayCount = await this.WithDrawHistoryRepository.getDayCount(hostId);
    const hourCount = await this.WithDrawHistoryRepository.getTimeCount(hostId);
    const audioTimeCount = await this.WithDrawHistoryRepository.getAudioHour(
      hostId
    );
    const videoTimeCount = await this.WithDrawHistoryRepository.getVideoHour(
      hostId
    );

    let salary = await this.SalaryRepository.getSalaryByAmount(totalSalary);

    if (dayCount >= 6 && videoTimeCount >= 12) {
      salary = salary.filter((s) => s.type == StreamType.Video);
    } else {
      salary = salary.filter((s) => s.type == StreamType.Audio);
    }

    if (salary.length == 0)
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        `${totalSalary} does not have both video and audio type`
      );

    const session = await mongoose.startSession();
    session.startTransaction();

    await this.UserStatsRepository.updateDiamonds(
      hostId,
      -(totalSalary - bonusDiamonds),
      session
    );

    const bonusObj: IWithdrawBonus = {
      accountNumber,
      totalDiamond: salary[0].diamondCount,
      totalSalary: salary[0].moneyCount,
      accountType,
      agencyId: host.parentCreator as string,
      hostId,
      country: host.country || "",
      name: host.name || "",
      withdrawDate: new Date(Date.now()),
      day: dayCount,
      time: hourCount,
      audioHour: audioTimeCount,
      videoHour: videoTimeCount,
    };

    const newWithdraw = await this.BonusRepository.createWithdrawBonus(
      bonusObj,
      session
    );

    await session.commitTransaction();
    session.endSession();

    if (!newWithdraw)
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "creating withdraw bonus failed"
      );
    return newWithdraw;
  }

  async getMyBonus(userId: string): Promise<number> {
    const myBonus =
      await this.RoomBonusRecordsRepository.readTotalBonusWithoutStatusSeen(
        userId
      );
    return myBonus;
  }

  async setChatPrivacy(payload: {
    id: string;
    whoCanTextMe: WhoCanTextMe;
    highLevelRequirements: { levelType: string; level: number }[];
  }): Promise<IUserDocument | null> {
    let { id, whoCanTextMe, highLevelRequirements } = payload;
    if (!highLevelRequirements) {
      highLevelRequirements = [];
    }
    const user = await this.UserRepository.findUserById(id);
    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "user not found");
    const updatedUser = await this.UserRepository.setWhoCanTextMe(id, {
      whoCanTextMe,
      highLevelRequirements,
    });
    return updatedUser;
  }

  async generateToken({
    channelName,
    uid,
    APP_CERTIFICATE,
    APP_ID,
  }: {
    channelName: string;
    uid: string;
    APP_CERTIFICATE: string;
    APP_ID: string;
  }): Promise<{ token: string }> {
    const expirationTimeInSeconds = 3600; // Token valid for 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
    const tokenExpire = privilegeExpiredTs;

    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      RtcRole.PUBLISHER, // Role: PUBLISHER or SUBSCRIBER
      tokenExpire,
      privilegeExpiredTs
    );
    return { token: token };
  }

  async agencyJoinRequest(
    data: IAgencyJoinRequest
  ): Promise<IAgencyJoinRequestDocument> {
    const user = await this.UserRepository.findUserById(data.userId as string);
    if (!user) throw new AppError(StatusCodes.NOT_FOUND, `user not found`);
    if (user.userRole != UserRoles.User)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Agency applications and cancellations are restricted to users."
      );
    const prevRequest =
      await this.AgencyJoinRequestRepository.getRequestCondiionally({
        userId: data.userId as string,
        agencyId: data.agencyId as string,
      });
    if (prevRequest)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `you have already applied for an agency`
      );

    const newRequest = await this.AgencyJoinRequestRepository.createRequest(
      data
    );
    return newRequest;
  }

  async joinRequestStatus(userId: string): Promise<{
    status: AgencyJoinStatus;
    agencyDetails: { name: string; hostCount: number } | null;
  }> {
    const user = await this.UserRepository.findUserById(userId);
    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "user not found");

    const request =
      await this.AgencyJoinRequestRepository.getRequestCondiionally({ userId });
    let agencyDetails = null;

    if (request) {
      const agency = await this.PortalUserRepository.getPortalUserById(
        request.agencyId as string
      );
      if (!agency)
        throw new AppError(StatusCodes.NOT_FOUND, "agency not found");
      const hostCount = await this.UserRepository.getHostCounts(
        request.agencyId as string
      );
      agencyDetails = { name: agency!.name, hostCount: hostCount };
    }

    if (user.userRole == UserRoles.User && !request)
      return { status: AgencyJoinStatus.List, agencyDetails: null };

    if (
      user.userRole == UserRoles.User &&
      request &&
      request.status == StatusTypes.pending
    )
      return { status: AgencyJoinStatus.Pending, agencyDetails: agencyDetails };

    if (
      user.userRole == UserRoles.Host &&
      request &&
      request.status == StatusTypes.accepted
    ) {
      await this.AgencyJoinRequestRepository.deleteRequest(
        request._id as string
      );
      return { status: AgencyJoinStatus.Congrats, agencyDetails };
    }

    if (user.userRole == UserRoles.Host && !request) {
      const agency = await this.PortalUserRepository.getPortalUserById(
        user.parentCreator as string
      );
      if (!agency)
        throw new AppError(StatusCodes.NOT_FOUND, "agency not found");
      const hostCount = await this.UserRepository.getHostCounts(
        user.parentCreator as string
      );
      agencyDetails = { name: agency!.name, hostCount: hostCount };
      return { status: AgencyJoinStatus.member, agencyDetails };
    }

    return { status: AgencyJoinStatus.error, agencyDetails: null };
  }

  async agencyCancelRequest(
    userId: string
  ): Promise<IAgencyJoinRequestDocument> {
    const user = await this.UserRepository.findUserById(userId);
    if (!user) throw new AppError(StatusCodes.BAD_REQUEST, `user not found`);
    if (user.userRole != UserRoles.User)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Agency applications and cancellations are restricted to users."
      );
    const request =
      await this.AgencyJoinRequestRepository.getRequestCondiionally({
        userId,
      });
    if (request) {
      const deleted = await this.AgencyJoinRequestRepository.deleteRequest(
        request._id as string
      );
      return deleted;
    }

    throw new AppError(StatusCodes.NOT_FOUND, "request not found");
  }

  async getLiveStatusCounts(hostId: string): Promise<{
    dayCount: number;
    hourCount: number;
    audioHour: number;
    videoHour: number;
  }> {
    const dayCount = await this.WithDrawHistoryRepository.getDayCount(hostId);
    const hourCount = await this.WithDrawHistoryRepository.getTimeCount(hostId);
    const audioTimeCount = await this.WithDrawHistoryRepository.getAudioHour(
      hostId
    );
    const videoTimeCount = await this.WithDrawHistoryRepository.getVideoHour(
      hostId
    );

    return {
      dayCount,
      hourCount,
      audioHour: audioTimeCount,
      videoHour: videoTimeCount,
    };
  }

  async isPremiumUser(userId: string): Promise<boolean> {
    const user = await this.UserRepository.findUserById(userId);
    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "user not found");
    return await checkPremiumItem(this.BucketRepository, userId);
  }
}
