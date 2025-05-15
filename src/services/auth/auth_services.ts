
import { IUserEntity } from "../../entities/user_entity_interface";
import { IUserRepository } from "../../repository/user_repository_interface";
import jwt from 'jsonwebtoken';
import { uploadFileToCloudinary } from "../../Utils/upload_file_cloudinary";
import { CloudinaryFolder } from "../../Utils/enums";

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
            const token = jwt.sign({ id: newUser._id }, SECRET);
            return { user: newUser, token };
        }
        const token = jwt.sign({ id: existingUser._id }, SECRET);
        return { user: existingUser, token };
    }

    async retrieveUserDetails(id: string) {
        return await this.UserRepository.findUserById(id);
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

