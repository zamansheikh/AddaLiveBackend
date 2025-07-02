import { IUserStats, IUSerStatsDocument } from "../../entities/userstats/userstats_interface";
import { ILeaderBoardResponse } from "../../services/game/game_service";

export default interface IUserStatsRepository {
    createUserstats(stats:IUserStats): Promise<IUSerStatsDocument | null >
    getUserStats(id: string): Promise<IUSerStatsDocument | null>;
    deleteStats(userId: string): Promise<IUSerStatsDocument | null>;
    updateProperty(id: string, property: Record<string, any>): Promise<IUSerStatsDocument | null>;
    updateStars(userId: string, stars: number): Promise<IUSerStatsDocument | null>;
    updateDiamonds(userId: string, diamonds: number): Promise<IUSerStatsDocument | null>;
    updateLevels(userId: string, levels: number): Promise<IUSerStatsDocument | null>;
    getUserLeaderBoardInfo(query: Record<string, string>): Promise<ILeaderBoardResponse[] | null>;


}