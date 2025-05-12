import { IUserEntity } from "../entities/user_entity_interface";
import { IUserDocument } from "../models/user_model_interface";

export interface IAuthService {
    registerWithGoogle(UserData: IUserEntity):Promise<{user: IUserDocument, token: string}>;
}