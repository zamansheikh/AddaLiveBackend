import { IUserDocument } from "../../models/user_model_interface";
import { IUserRepository } from "../../repository/user_repository_interface";

export default class AdminUserService {
    UserRepository: IUserRepository;
    constructor(UserRepository: IUserRepository) {
        this.UserRepository = UserRepository;
    }

    async retrieveAllUsers() {
        const users = await this.UserRepository.findAllUser();
        return users;
    }


    
}


export interface IAdminUserService {
    retrieveAllUsers(): Promise<IUserDocument[] | null>;
}

