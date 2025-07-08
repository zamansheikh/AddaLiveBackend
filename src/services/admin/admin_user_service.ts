import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IUserDocument } from "../../models/user/user_model_interface";
import { IUserRepository } from "../../repository/user_repository_interface";
import { IUSerStatsDocument } from "../../entities/userstats/userstats_interface";
import IUserStatsRepository from "../../repository/userstats/userstats_repository_interface";
import { IAdminRepository } from "../../repository/admin/admin_repository";
import { IAdmin, IAdminDocument } from "../../entities/admin/admin_interface";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


export interface IAdminUserService {
    loginAdmin(credentials: { username: string, password: string }): Promise<IAdminDocument | null>;
    registerAdmin(admin: IAdmin):  Promise<IAdminDocument | null>;
    updateAdmin(id: string, admin: Partial<IAdmin>): Promise<IAdminDocument | null>;
    deleteAdmin(id: string): Promise<IAdminDocument | null>;
    retrieveAllUsers(): Promise<IUserDocument[] | null>;
    updateActivityZone({ id, zone, dateTill }: { id: string, zone: "safe" | "temp_block" | "permanent_block", dateTill?: string }): Promise<IUserDocument | null>
    updateUserStat(body: { diamonds?: number, stars?: number, userId: string }): Promise<IUSerStatsDocument>
}


export default class AdminUserService implements IAdminUserService {
    UserRepository: IUserRepository;
    UserStatsRepository: IUserStatsRepository;
    AdminRepository: IAdminRepository;
    constructor(UserRepository: IUserRepository, UserStatsRepository: IUserStatsRepository, AdminRepository: IAdminRepository) {
        this.UserRepository = UserRepository;
        this.UserStatsRepository = UserStatsRepository;
        this.AdminRepository = AdminRepository;
    }

    async loginAdmin(credentials: { username: string, password: string }): Promise<IAdminDocument | null> {
        const admin = await this.AdminRepository.getAdminByUsername(credentials.username);
        if (!admin) {
            throw new AppError(StatusCodes.NOT_FOUND, "Admin not found");
        }
        if (admin.password !== credentials.password) {
            throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid credentials");
        }
        return admin;
    }

    async registerAdmin(admin: IAdmin): Promise<IAdminDocument | null> {
        const existingAdmin = await this.AdminRepository.getAdmin();
        if (existingAdmin) {
            throw new AppError(StatusCodes.CONFLICT, "Admin with this username already exists");
        }
        const hashedPass = await bcrypt.hash(admin.password, 10);
        const newAdmin = await this.AdminRepository.createAdmin({ ...admin, password: hashedPass });
        return newAdmin;
    }

    async updateAdmin(id: string, admin: Partial<IAdmin>): Promise<IAdminDocument | null> {
        const updatedAdmin = await this.AdminRepository.updateAdmin(id, admin);
        if (!updatedAdmin) {
            throw new AppError(StatusCodes.NOT_FOUND, "Admin not found");
        }
        return updatedAdmin;
    }

    async deleteAdmin(id: string): Promise<IAdminDocument | null> {
        const deletedAdmin = await this.AdminRepository.deleteAdmin(id);
        if (!deletedAdmin) {
            throw new AppError(StatusCodes.NOT_FOUND, "Admin not found");
        }
        return deletedAdmin;
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



