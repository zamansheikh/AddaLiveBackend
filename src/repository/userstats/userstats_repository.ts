import { IUserStats, IUSerStatsDocument, IUSerStatsModel } from "../../entities/userstats/userstats_interface";
import IUserStatsRepository from "./userstats_repository_interface";


export default class UserStatsRepository implements IUserStatsRepository {
    model: IUSerStatsModel;
    constructor(model: IUSerStatsModel) {
        this.model = model;
    }

    async createUserstats(stats: IUserStats): Promise<IUSerStatsDocument | null> {
        const userstats = await this.model.create(stats);
        return await userstats.save();
    }

    async deleteStats(userId: string): Promise<IUSerStatsDocument | null> {
        return await this.model.findOneAndDelete({ userId });
    }

    async getUserStats(userId: string): Promise<IUSerStatsDocument | null> {
        return await this.model.findOne({ userId });
    }

    async updateStars(userId: string, stars: number): Promise<IUSerStatsDocument | null> {
        return await this.model.findOneAndUpdate({ userId }, { $inc: { stars } }, { new: true });
    }

    async updateDiamonds(userId: string, diamonds: number): Promise<IUSerStatsDocument | null> {
        return await this.model.findOneAndUpdate({ userId }, { $inc: { diamonds } }, { new: true });
    }

    async updateLevels(userId: string, levels: number): Promise<IUSerStatsDocument | null> {
        return await this.model.findOneAndUpdate({ userId }, { $inc: { levels } }, { new: true });
    }


}