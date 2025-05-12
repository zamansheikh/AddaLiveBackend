import { IUserEntity } from "../entities/user_entity_interface";
import { IUserModel } from "../models/user_model_interface";

export default class UserRepository {
    UserModel: IUserModel;
    constructor(UserModel: IUserModel) {
        this.UserModel = UserModel;
    }

    async create(UserEntity: IUserEntity) {
        const user = new this.UserModel(UserEntity);
        return await user.save();
    }

    async findByUID(uid: number) {
        return await this.UserModel.findOne({ uid });
    }
}

