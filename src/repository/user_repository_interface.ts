import { IUserEntity } from "../entities/user_entity_interface";
import { IUserDocument } from "../models/user_model_interface";

export interface IUserRepository {
    create(userEntity: IUserEntity): Promise<IUserDocument>;
    findUserById(id: string): Promise<IUserDocument | null>;
    findByUID(uid: number): Promise<IUserDocument | null>;
    findUserByIdAndUpdate(id: string, payload: Record<string, any>): Promise<IUserDocument | null>;
}