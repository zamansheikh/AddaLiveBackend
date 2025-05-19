import { IUserEntity } from "../entities/user_entity_interface";
import { IUserModel } from "../models/user/user_model_interface";

export default class UserRepository {
    UserModel: IUserModel;
    constructor(UserModel: IUserModel) {
        this.UserModel = UserModel;
    }

    async create(UserEntity: IUserEntity) {
        const user = new this.UserModel(UserEntity);
        return await user.save();
    }

    async findUserById(id: string) {
        return await this.UserModel.findById(id);
    }

    async findByUID(uid: string) {
        return await this.UserModel.findOne({ uid });
    }
    
    async findAllUser(){
        return await this.UserModel.find();
    }

    async findUsersConitionally(field: string, value: string | number) {
        return await this.UserModel.find({ [field]: value });
    }

    async findUserByIdAndUpdate(id:string, payload:Record<string, any>) {
        return await this.UserModel.findByIdAndUpdate(id, payload, {new:true});
    }
}

