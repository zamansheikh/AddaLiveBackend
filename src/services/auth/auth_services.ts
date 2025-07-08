
import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { CloudinaryFolder, GiftTypes } from "../../core/Utils/enums";
import { uploadFileToCloudinary } from "../../core/Utils/upload_file_cloudinary";
import { IUserEntity } from "../../entities/user_entity_interface";
import { IUserRepository } from "../../repository/user_repository_interface";
import jwt from 'jsonwebtoken';
import IUserStatsRepository from "../../repository/userstats/userstats_repository_interface";
import { Types } from "mongoose";
import { IAuthService, IGiftUser } from "./auth_service_interface";
import { IUserDocument } from "../../models/user/user_model_interface";
import mongoose from "mongoose";
import { RtcRole, RtcTokenBuilder } from "agora-token";

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
        const token = jwt.sign({ id: existingUser._id, role: existingUser.userRole }, SECRET);
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

    async giftUser(giftUser: IGiftUser): Promise<IUserDocument | null> {
        const { myId, giftType, diamonds, userId } = giftUser;

        if (!Object.values(GiftTypes).includes(giftType as GiftTypes)) throw new AppError(StatusCodes.BAD_REQUEST, "invalid gift type");
        const myUser = await this.UserRepository.findUserById(myId);
        const userToGift = await this.UserRepository.findUserById(userId);
        if (!myUser || !userToGift) throw new AppError(StatusCodes.NOT_FOUND, "user not found");

        const mystats = await this.UserStatsRepository.getUserStats(myId);
        const userStats = await this.UserStatsRepository.getUserStats(userId);

        if (!mystats || !userStats) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "user stats not found");

        // starting a new session for safe rollback
        const session = await mongoose.startSession();
        session.startTransaction();

        if (diamonds) {
            if (mystats.diamonds! < diamonds) throw new AppError(StatusCodes.BAD_REQUEST, "insufficient diamonds");
            // TODO: later the diamond amount will be extracted from db
            mystats.diamonds! -= diamonds;
            const updatedMyStats = await mystats.save({ session });
            if (!updatedMyStats) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "updating my stats failed");
        } else {
            let giftFound = false;
            if (mystats.gifts && mystats.gifts.length > 0) {
                const length = mystats.gifts.length;
                for (let i = 0; i < length; i++) {
                    if (mystats.gifts[i].gift === giftType) {
                        if (mystats.gifts[i].count! < 1) throw new AppError(StatusCodes.BAD_REQUEST, "insufficient gifts");
                        mystats.gifts[i].count! -= 1;
                        giftFound = true;
                        break;
                    }
                }
            }
            if (!giftFound) throw new AppError(StatusCodes.BAD_REQUEST, "insufficient gifts");

            const updatedMyStats = await mystats.save({ session });
            if (!updatedMyStats) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "updating my stats failed");
        }

        // checking if already the item exists in the list of gifts
        let giftSent = false;

        if (userStats.gifts && userStats.gifts.length > 0) {
            const length = userStats.gifts.length;
            for (let i = 0; i < length; i++) {
                if (userStats.gifts[i].gift === giftType) {
                    userStats.gifts[i].count! += 1;
                    giftSent = true;
                    break;
                }
            }
        }

        if (!giftSent) {
            userStats.gifts = userStats.gifts || [];
            userStats.gifts?.push({
                gift: giftType as GiftTypes,
                count: 1,
            });
        }

        // todo: later create transaction documents

        const updatedUserStats = await userStats.save({ session });

        await session.commitTransaction();
        session.endSession();

        if (!updatedUserStats) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "updating user stats failed");


        const userWithStats = userToGift.toObject();
        userWithStats.stats = updatedUserStats;
        return userWithStats;
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
