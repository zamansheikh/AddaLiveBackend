import { IUserEntity } from "../entities/user_entity_interface";
import { IUserDocument } from "../models/user/user_model_interface";

export interface IUserRepository {
    create(userEntity: IUserEntity): Promise<IUserDocument>;
    findUserById(id: string): Promise<IUserDocument | null>;
    getUserDetailsSelectedField(id: string, fields: string[]): Promise<IUserDocument | null>;
    findByUID(uid: string): Promise<IUserDocument | null>;
    findAllUser(): Promise<IUserDocument[] | null>;
    findUsersConitionally(field: string, value: string | number): Promise<IUserDocument[] | null>
    findUserByIdAndUpdate(id: string, payload: Record<string, any>): Promise<IUserDocument | null>;
    getUserDetails(details: { userId: string, myId: string }): Promise<IUserDocument | null>;
}