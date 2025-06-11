import { IUserStats, IUSerStatsDocument } from "../../entities/userstats/userstats_interface";

export default interface IUserStatsRepository {
    createUserstats(stats:IUserStats): Promise<IUSerStatsDocument | null >
    getUserStats(userId: string): Promise<IUSerStatsDocument | null>;
    deleteStats(userId: string): Promise<IUSerStatsDocument | null>;
    updateStars(userId: string, stars: number): Promise<IUSerStatsDocument | null>;
    updateDiamonds(userId: string, diamonds: number): Promise<IUSerStatsDocument | null>;
    updateLevels(userId: string, levels: number): Promise<IUSerStatsDocument | null>;

}