
import { log } from "console";
import cloudinary from "../../config/cloudaniay_config";
import { IUserEntity } from "../../entities/user_entity_interface";
import { IUserRepository } from "../../repository/user_repository_interface";
import jwt from 'jsonwebtoken';
import { generateFileHash } from "../../Utils/helper_functions";

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

    async updateProfile({ id, profileData, file }: { id: string, profileData: Partial<Record<string, any>>, file?: Express.Multer.File }) {
        const updatePayload: Record<string, any> = {};

        let profilePicUrl;
        if (file) {

            const fileHash = generateFileHash(file.buffer);
            const publicId = `user_profiles/${fileHash}`;

      
                    profilePicUrl = await new Promise<string>((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream(
                            {
                                public_id: publicId, // Ensures hash is used
                                folder: 'user_profiles',
                                resource_type: 'image',
                                overwrite: false, // Don't overwrite if already exists
                            },
                            (error, result) => {
                                if (error || !result) return reject(error);
                                resolve(result.secure_url);
                            }
                        );
                        stream.end(file.buffer);
                    });
                
          
            // adds the image to the payload
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

