import { WhoCanTextMe } from "../../core/Utils/enums";
import { IUserEntity } from "../../entities/user_entity_interface";
import { IUserDocument } from "../../models/user/user_model_interface";

export interface IGiftUser {
    myId: string;
    coins: number;
    diamonds: number;
    userId: string;
}

export interface IAuthService {
    registerWithGoogle(UserData: IUserEntity): Promise<{ user: IUserDocument, token: string }>;
    retrieveMyDetails(id: string): Promise<IUserDocument | null>;
    retrieveUserDetails(id: string, myId: string): Promise<IUserDocument | null>;
    updateProfile({ id, profileData, file }: { id: string, profileData: Partial<Record<string, any>>, file?: Express.Multer.File }): Promise<IUserDocument | null>;
    giftUser(giftUser: IGiftUser, roomId: string): Promise<IUserDocument | null>;
    generateToken(info: {channelName: string, uid: string, APP_CERTIFICATE?: string, APP_ID?: string }): Promise<{token: string}>;
    setChatPrivacy(payload: { id: string, whoCanTextMe: WhoCanTextMe, highLevelRequirements: { levelType: string, level: number }[] }): Promise<IUserDocument | null>;
}

