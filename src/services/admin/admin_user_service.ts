import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IUserDocument } from "../../models/user/user_model_interface";
import { IUserRepository } from "../../repository/user_repository_interface";
import { IUSerStatsDocument } from "../../entities/userstats/userstats_interface";
import IUserStatsRepository from "../../repository/userstats/userstats_repository_interface";



export default class AdminUserService implements IAdminUserService {
    UserRepository: IUserRepository;
    UserStatsRepository: IUserStatsRepository;
    constructor(UserRepository: IUserRepository, UserStatsRepository: IUserStatsRepository) {
        this.UserRepository = UserRepository;
        this.UserStatsRepository = UserStatsRepository;
    }

    async retrieveAllUsers() {
        const users = await this.UserRepository.findAllUser();
        return users;
    }

    async updateActivityZone({ id, zone, dateTill }: { id: string, zone: "safe" | "temp_block" | "permanent_block", dateTill?: string }) {
        const user = await this.UserRepository.findUserById(id);
        if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
        let payload: Record<string, any> = {};
        payload["zone"] = zone;
        payload["createdAt"] = new Date().toISOString();
        if (zone === "temp_block" && dateTill != null) {
            payload["expire"] = dateTill;
        }
        const finalPayload = { activity_zone: payload }
        return await this.UserRepository.findUserByIdAndUpdate(id, finalPayload);
    }

    async updateUserStat(body: { diamonds?: number; stars?: number; userId: string }): Promise<IUSerStatsDocument> {
        let userStatReturnBody = await this.UserStatsRepository.getUserStats(body.userId);
        
        if (!userStatReturnBody) throw new AppError(StatusCodes.NOT_FOUND, "User stats not found");
        userStatReturnBody = null;
        if (body.diamonds) {
            userStatReturnBody = await this.UserStatsRepository.updateDiamonds(body.userId, body.diamonds);
            if (!userStatReturnBody) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "failed update diamonds")
        }
        if (body.stars) {
            userStatReturnBody = await this.UserStatsRepository.updateStars(body.userId, body.stars);
            if (!userStatReturnBody) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "failed update stars")
        }

        return userStatReturnBody!;
    }


}


export interface IAdminUserService {
    retrieveAllUsers(): Promise<IUserDocument[] | null>;
    updateActivityZone({ id, zone, dateTill }: { id: string, zone: "safe" | "temp_block" | "permanent_block", dateTill?: string }): Promise<IUserDocument | null>
    updateUserStat(body: { diamonds?: number, stars?: number, userId: string }): Promise<IUSerStatsDocument>
}

