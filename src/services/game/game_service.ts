import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IPagination } from "../../core/Utils/query_builder";
import { IHistory, IHistoryDocument } from "../../entities/history/history_interface";
import { IUSerStatsDocument } from "../../entities/userstats/userstats_interface";
import { IHistoryRepository } from "../../repository/history/history_repository";
import IUserStatsRepository from "../../repository/userstats/userstats_repository_interface";
import { UserStatus } from "../../core/Utils/enums";
import { IUserRepository } from "../../repository/user_repository";

export interface ILeaderBoardResponse {
    serial: string | null;
    user_name: string | null;
    profile_image_url: string | null;
    total_gold: number | null;
    total_diamond: number | null;
}


export interface IGetHistory {
    serial: string,
    status: UserStatus,
    result_history: Partial<IHistory>[] | null;
}

export interface IGameService {
    getUserLeaderBoardInfo(query: Record<string, string>): Promise<ILeaderBoardResponse[]>;
    updateUserCredits(userId: string, gold: number, diamond: number): Promise<IUSerStatsDocument>;
    createHistory(history: IHistory): Promise<IHistoryDocument>;
    getHistory(userId: string, date: string): Promise<IGetHistory>;
    getUserInfo(userId: string): Promise<ILeaderBoardResponse>;
}


export default class GameService implements IGameService {
    StatsRepo: IUserStatsRepository;
    HistoryRepo: IHistoryRepository;
    userRepo: IUserRepository;
    constructor(StatsRepo: IUserStatsRepository, HistoryRepo: IHistoryRepository, userRepo: IUserRepository) {
        this.StatsRepo = StatsRepo;
        this.HistoryRepo = HistoryRepo;
        this.userRepo = userRepo;
    }

    async getUserLeaderBoardInfo(query: Record<string, string>): Promise<ILeaderBoardResponse[]> {
        const leaderboard = await this.StatsRepo.getUserLeaderBoardInfo(query);
        if (!leaderboard) throw new AppError(StatusCodes.NOT_FOUND, "Leaderboard not found");
        return leaderboard;
    }

    async updateUserCredits(userId: string, gold: number, diamonds: number): Promise<IUSerStatsDocument> {
        const user = await this.userRepo.findUserById(userId);
        if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");

        let userStats = await this.StatsRepo.getUserStats(userId);


        if (!userStats) throw new AppError(StatusCodes.NOT_FOUND, "user stats were not found");

        const updatedStats = await this.StatsRepo.updateProperty(userId, { diamonds });

        if (!updatedStats) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to update stats");

        return updatedStats!;
    }

    async createHistory(history: IHistory): Promise<IHistoryDocument> {
        const user = await this.userRepo.findUserById(history.userId.toString());
        if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
        const newHistory = await this.HistoryRepo.createHistory(history);
        if (!newHistory) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to create history");
        return newHistory;
    }

    async getHistory(userId: string, date: string): Promise<IGetHistory> {
        const user = await this.userRepo.findUserById(userId);
        const history = await this.HistoryRepo.getHistory(userId, date);
        // if (!history) throw new AppError(StatusCodes.NOT_FOUND, "History not found");

        const response = {
            serial: userId,
            status: !user ? UserStatus.inactive : UserStatus.active,
            result_history: history
        };

        return response;
    }

    async getUserInfo(userId: string): Promise<ILeaderBoardResponse> {
        const user = await this.userRepo.findUserById(userId);
        // if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
        const userStats = await this.StatsRepo.getUserStats(userId);
        // if (!userStats) throw new AppError(StatusCodes.NOT_FOUND, "User stats not found");
        return {
            serial: userStats == null ? null : userStats._id as string,
            user_name: user == null ? null : user.name as string,
            profile_image_url: user == null ? null : user.avatar as string,
            total_gold: userStats == null ? null : userStats.diamonds as number,
            total_diamond: userStats == null ? null : userStats.diamonds as number
        };
    }
}