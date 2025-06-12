import { IUserEntity } from "../../entities/user_entity_interface";
import { IUserDocument } from "../../models/user/user_model_interface";

<<<<<<< HEAD
export interface IGiftUser {
    myId: string;
    giftType: string;
    diamonds: number;
    userId: string;
}

=======
>>>>>>> 3daa7017c0d1b6a65da4bab0dbe1fda4aa7177ef
export interface IAuthService {
    registerWithGoogle(UserData: IUserEntity): Promise<{ user: IUserDocument, token: string }>;
    retrieveUserDetails(id: string, myId: string): Promise<IUserDocument | null>;
    updateProfile({ id, profileData, file }: { id: string, profileData: Partial<Record<string, any>>, file?: Express.Multer.File }): Promise<IUserDocument | null>;
<<<<<<< HEAD
    giftUser(giftUser: IGiftUser): Promise<IUserDocument | null>;
}

=======
}
>>>>>>> 3daa7017c0d1b6a65da4bab0dbe1fda4aa7177ef
