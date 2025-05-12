import { IUserEntity } from "../entities/user_entity_interface";
import { IUserDocument } from "../models/user_model_interface";

export interface IUserRepository {
    create(userEntity: IUserEntity): Promise<IUserDocument>;
    findByUID(uid:number): Promise<IUserDocument | null>;
}