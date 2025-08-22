import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import {
  CloudinaryFolder,
  GiftTypes,
  SocketChannels,
  WhoCanTextMe,
} from "../../core/Utils/enums";
import { uploadFileToCloudinary } from "../../core/Utils/upload_file_cloudinary";
import { IUserEntity } from "../../entities/user_entity_interface";
import jwt from "jsonwebtoken";
import IUserStatsRepository from "../../repository/userstats/userstats_repository_interface";
import { Types, UpdateResult } from "mongoose";
import { IAuthService, IGiftUser } from "./auth_service_interface";
import { IUserDocument } from "../../models/user/user_model_interface";
import mongoose from "mongoose";
import { RtcRole, RtcTokenBuilder } from "agora-token";
import { IUserRepository } from "../../repository/user_repository";
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
import { existsSync } from "fs";

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
    StoriesReactionRepository: IStoryReactionRepository
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
  }

  async registerWithGoogle(UserData: IUserEntity) {
    const existingUser = await this.UserRepository.findByUID(UserData.uid);
    const SECRET = process.env.JWT_SECRET || "jwt_secret";

    if (!existingUser) {
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

  async retrieveMyDetails(id: string): Promise<IUserDocument | null> {
    const user = await this.UserRepository.findUserById(id);
    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "user not found");
    const userStats = await this.UserStatsRepository.getUserStats(id);
    const userWithStats = user.toObject();
    userWithStats.stats = userStats;
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
    const user = await this.UserRepository.getUserDetails({ Id: id, myId });
    return user;
  }

  async updateProfile({
    id,
    profileData,
    file,
  }: {
    id: string;
    profileData: Partial<Record<string, any>>;
    file?: Express.Multer.File;
  }) {
    const user = await this.UserRepository.findUserById(id);
    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "user not found");
    const updatePayload: Record<string, any> = {};
    let profilePicUrl;
    if (file) {
      profilePicUrl = await uploadFileToCloudinary({
        isVideo: false,
        folder: CloudinaryFolder.UserPRofile,
        file: file,
      });
      updatePayload["avatar"] = profilePicUrl;
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
    if (hasMyId) mystats.diamonds! += exisitngGift.diamonds * qty;
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
    SocketServer.getInstance().updateRoomCoin(roomId, exisitngGift.diamonds * qty );

    ioInstance.to(roomId).emit(SocketChannels.sendGift, {
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

    const message = {
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
    };
    ioInstance.to(roomId).emit(SocketChannels.sendMessage, message);

    if (!updateStats)
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "updating user stats failed"
      );

    if(hasMyId && otherIds){
      updateStats.matchedCount +=1;
      updateStats.modifiedCount +=1;
    }

    return updateStats;
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
}
