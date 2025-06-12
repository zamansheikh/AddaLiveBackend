
import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { CloudinaryFolder } from "../../core/Utils/enums";
import { uploadFileToCloudinary } from "../../core/Utils/upload_file_cloudinary";
import { IUserEntity } from "../../entities/user_entity_interface";
import { IUserRepository } from "../../repository/user_repository_interface";
import jwt from 'jsonwebtoken';

export default class AuthService {
    UserRepository: IUserRepository;
    constructor(UserRepository: IUserRepository) {
        this.UserRepository = UserRepository;
    }

    async registerWithGoogle(UserData: IUserEntity) {
        const existingUser = await this.UserRepository.findByUID(UserData.uid);
        const SECRET = process.env.JWT_SECRET || "jwt_secret";
        if (!existingUser) {
            const newUser = await this.UserRepository.create(UserData);
            if(!newUser) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "creating the user failed");
            const token = jwt.sign({ id: newUser._id }, SECRET);
            return { user: newUser, token };
        }
        const token = jwt.sign({ id: existingUser._id }, SECRET);
        return { user: existingUser, token };
    }

    async retrieveUserDetails(id: string, myId: string) {
        return await this.UserRepository.getUserDetails({userId: id, myId});
    }

    async updateProfile({ id, profileData, file }: { id: string, profileData: Partial<Record<string, any>>, file?: Express.Multer.File }) {
        const updatePayload: Record<string, any> = {};
        let profilePicUrl;
        if (file) {
            profilePicUrl = await uploadFileToCloudinary({ isVideo: false, folder: CloudinaryFolder.UserPRofile, file: file });
            updatePayload['avatar'] = {
                name: file.originalname,
                url: profilePicUrl,
            };
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
}

