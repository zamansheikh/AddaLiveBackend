import { IUserDocument } from "../../models/user/user_model_interface";
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

    async updateActivityZone({id, zone, dateTill}: {id: string, zone: "safe" | "temp_block" | "permanent_block", dateTill?:string }) {
        let payload: Record<string, any> = {};
        payload["zone"] = zone;
        payload["createdAt"] = new Date().toISOString();
        if (zone === "temp_block" && dateTill != null) { 
            payload["expire"] = dateTill;
        }

        const finalPayload = {activity_zone: payload}

        return await this.UserRepository.findUserByIdAndUpdate(id, finalPayload);
        
    }
}


export interface IAdminUserService {
    retrieveAllUsers(): Promise<IUserDocument[] | null>;
    updateActivityZone({id, zone, dateTill}: {id: string, zone: "safe" | "temp_block" | "permanent_block", dateTill?:string }) : Promise<IUserDocument | null>
}

