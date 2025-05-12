import { IUserEntity } from "../entities/user_entity_interface";
import { IUserRepository } from "../repository/user_repository_interface";
import jwt from 'jsonwebtoken';

export default class AuthService {
    UserRepository: IUserRepository;
    constructor(UserRepository: IUserRepository) {
        this.UserRepository = UserRepository;
    }

    async registerWithGoogle(UserData: IUserEntity) {
        const existingUser = await this.UserRepository.findByUID(UserData.uid);
         const SECRET = process.env.JWT_SECRET || "jwt_secret";
        if (!existingUser) {
            const newUser = await this.UserRepository.create(UserData);
            const token =  jwt.sign(newUser.email, SECRET);
            return { user: newUser, token };
        }
        const token = jwt.sign(existingUser.email, SECRET);
         return { user: existingUser, token };
    }
}

