import { IUserEntity } from "../../entities/user_entity_interface";
import { IUserDocument } from "../../models/user/user_model_interface";

export interface IAuthService {
    registerWithGoogle(UserData: IUserEntity): Promise<{ user: IUserDocument, token: string }>;
    retrieveUserDetails(id: string): Promise<IUserDocument | null>;
    updateProfile({ id, profileData, file }: { id: string, profileData: Partial<Record<string, any>>, file?: Express.Multer.File }): Promise<IUserDocument | null>;
}