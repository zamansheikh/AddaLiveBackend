import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import IUserStatsRepository from "../../repository/users/userstats_repository_interface";

export interface IGreedyGameService {
  getUserBalance(userId: string): Promise<{ coins: number; diamonds: number; frozen: boolean }>;
}

export default class GreedyGameService implements IGreedyGameService {
  UserStatsRepo: IUserStatsRepository;

  constructor(UserStatsRepo: IUserStatsRepository) {
    this.UserStatsRepo = UserStatsRepo;
  }

  async getUserBalance(userId: string): Promise<{ coins: number; diamonds: number; frozen: boolean }> {
    const userStats = await this.UserStatsRepo.getUserStats(userId);

    if (!userStats) {
      throw new AppError(StatusCodes.NOT_FOUND, "User stats not found");
    }

    return {
      coins: userStats.coins ?? 0,
      diamonds: userStats.diamonds ?? 0,
      frozen: false,
    };
  }
}
