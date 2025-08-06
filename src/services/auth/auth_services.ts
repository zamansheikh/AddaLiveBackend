
import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { CloudinaryFolder, GiftTypes, SocketChannels, WhoCanTextMe } from "../../core/Utils/enums";
import { uploadFileToCloudinary } from "../../core/Utils/upload_file_cloudinary";
import { IUserEntity } from "../../entities/user_entity_interface";
import jwt from 'jsonwebtoken';
import IUserStatsRepository from "../../repository/userstats/userstats_repository_interface";
import { Types } from "mongoose";
import { IAuthService, IGiftUser } from "./auth_service_interface";
import { IUserDocument } from "../../models/user/user_model_interface";
import mongoose from "mongoose";
import { RtcRole, RtcTokenBuilder } from "agora-token";
import { IUserRepository } from "../../repository/user_repository";
import SocketServer from "../../core/sockets/socket_server";

export default class AuthService implements IAuthService {

    UserRepository: IUserRepository;
    UserStatsRepository: IUserStatsRepository

    constructor(UserRepository: IUserRepository, UserStatsRepository: IUserStatsRepository) {
        this.UserRepository = UserRepository;
        this.UserStatsRepository = UserStatsRepository;
    }

    async registerWithGoogle(UserData: IUserEntity) {
        const existingUser = await this.UserRepository.findByUID(UserData.uid);
        const SECRET = process.env.JWT_SECRET || "jwt_secret";

        if (!existingUser) {
            const newUser = await this.UserRepository.create(UserData);
            // if a instance exists with this new _id that is a false data and is being purged.
            const stats = await this.UserStatsRepository.getUserStats(newUser._id as string);
            if (stats) await this.UserStatsRepository.deleteStats(newUser._id as string);
            const newStats = await this.UserStatsRepository.createUserstats({
                userId: new Types.ObjectId(newUser._id as string),
            });

            if (!newStats) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "creating the user stats failed");
            if (!newUser) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "creating the user failed");
            const userWithStats = newUser.toObject();
            userWithStats.stats = newStats;
            // console.log("new userstats", newStats);
            // console.log("new user modified", newUser);
            const token = jwt.sign({ id: newUser._id, role: newUser.userRole }, SECRET);
            return { user: userWithStats, token };
        }

        let userStats = await this.UserStatsRepository.getUserStats(existingUser._id as string);
        // every user should have their respective stats created

        if (!userStats) {
            userStats = await this.UserStatsRepository.createUserstats({ userId: existingUser._id as string });
        }
        const userWithStats = existingUser.toObject();
        userWithStats.stats = userStats;
        const token = jwt.sign({ id: existingUser._id, role: existingUser.userRole, permissions: existingUser.userPermissions }, SECRET);
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


    async retrieveUserDetails(id: string, myId: string) {
        const profile = await this.UserRepository.findUserById(id);
        const myProfile = await this.UserRepository.findUserById(id);
        if (!profile || !myProfile) throw new AppError(StatusCodes.NOT_FOUND, "Invalid user Id");
        const user = await this.UserRepository.getUserDetails({ Id: id, myId });
        return user;
    }

    async updateProfile({ id, profileData, file }: { id: string, profileData: Partial<Record<string, any>>, file?: Express.Multer.File }) {
        const user = await this.UserRepository.findUserById(id);
        if(!user) throw new AppError(StatusCodes.NOT_FOUND, "user not found");
        const updatePayload: Record<string, any> = {};
        let profilePicUrl;
        if (file) {
            profilePicUrl = await uploadFileToCloudinary({ isVideo: false, folder: CloudinaryFolder.UserPRofile, file: file });
            updatePayload['avatar'] = profilePicUrl
        }
        // Filter and add only valid keys from profileData
        for (const [key, value] of Object.entries(profileData)) {
            if (value !== undefined) {
                updatePayload[key] = value;
            }
        }
        if (Object.keys(updatePayload).length === 0) {
            throw new Error('No valid data provided for update.');
        }
        return this.UserRepository.findUserByIdAndUpdate(id, updatePayload);
    }

    async giftUser(giftUser: IGiftUser, roomId: string): Promise<IUserDocument | null> {
        const { myId, coins, diamonds, userId } = giftUser;
        const myUser = await this.UserRepository.findUserById(myId);
        const userToGift = await this.UserRepository.findUserById(userId);
        if (!myUser || !userToGift) throw new AppError(StatusCodes.NOT_FOUND, "user not found");

        const mystats = await this.UserStatsRepository.getUserStats(myId);
        const userStats = await this.UserStatsRepository.getUserStats(userId);

        if (!mystats || !userStats) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "user stats not found");

        // starting a new session for safe rollback
        const session = await mongoose.startSession();
        session.startTransaction();

        if(mystats.coins! < coins) throw new AppError(StatusCodes.BAD_REQUEST, "insufficient coins");
        mystats.coins! -= coins;
        await mystats.save({ session });
        userStats.diamonds! += diamonds;
        const updatedUserStats = await userStats.save({ session });

        await session.commitTransaction();
        session.endSession();

        // sending the information to the frontend via socket
        const ioInstance = SocketServer.getInstance().getIO();

        ioInstance.to(roomId).emit(SocketChannels.sendGift, {
            avatar: myUser.avatar,
            name: myUser.name,
            diamonds: diamonds,
        });
        

        if (!updatedUserStats) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "updating user stats failed");


        const userWithStats = userToGift.toObject();
        userWithStats.stats = updatedUserStats;
        return userWithStats;
    }

    async setChatPrivacy(payload: { id: string; whoCanTextMe: WhoCanTextMe; highLevelRequirements: { levelType: string; level: number; }[]; }): Promise<IUserDocument | null> {
        let { id, whoCanTextMe, highLevelRequirements } = payload;
        if(!highLevelRequirements) {
            highLevelRequirements = [];
        }
        const user = await this.UserRepository.findUserById(id);
        if (!user) throw new AppError(StatusCodes.NOT_FOUND, "user not found");
        const updatedUser = await this.UserRepository.setWhoCanTextMe(id, {  whoCanTextMe, highLevelRequirements });
        return updatedUser;
    }
    

    async generateToken({ channelName, uid, APP_CERTIFICATE, APP_ID }: { channelName: string; uid: string; APP_CERTIFICATE: string; APP_ID: string; }): Promise<{ token: string }> {

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
