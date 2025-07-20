import mongoose, { ClientSession } from "mongoose";
import { IUserStats, IUSerStatsDocument, IUSerStatsModel } from "../../entities/userstats/userstats_interface";
import { ILeaderBoardResponse } from "../../services/game/game_service";
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

    async getUserStats(id: string): Promise<IUSerStatsDocument | null> {
        const userId = new mongoose.Types.ObjectId(id)
        return await this.model.findOne({ userId });
    }

    async updateCoins(userId: string, coins: number, session?: ClientSession): Promise<IUSerStatsDocument | null> {
        return await this.model.findOneAndUpdate({ userId }, { $inc: { coins } }, { new: true });
    }


    async updateStars(userId: string, stars: number): Promise<IUSerStatsDocument | null> {
        return await this.model.findOneAndUpdate({ userId }, { $inc: { stars } }, { new: true });
    }

    async updateDiamonds(userId: string, diamonds: number, session?: mongoose.ClientSession): Promise<IUSerStatsDocument | null> {
        return await this.model.findOneAndUpdate({ userId }, { $inc: { diamonds } }, { new: true }).session(session || null);
    }

    async updateLevels(userId: string, levels: number): Promise<IUSerStatsDocument | null> {
        return await this.model.findOneAndUpdate({ userId }, { $inc: { levels } }, { new: true });
    }

    async updateProperty(id: string, property: Record<string, any>): Promise<IUSerStatsDocument | null> {
        return await this.model.findOneAndUpdate({ userId: id }, property, { new: true });
    }

    async getUserLeaderBoardInfo(query: Record<string, string>): Promise<ILeaderBoardResponse[] | null> {
        const leaderboard = await this.model.aggregate([

            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" },
            {
                $project: {
                    serial: { $toString: "$_id" },
                    user_name: "$user.name",
                    profile_image_url: "$user.avatar",
                    total_gold: "$coins",
                    total_diamond: "$coins"
                }
            },
            {
                $sort: {
                    total_diamond: -1 // 👈 sort by diamonds descending
                }
            }
        ]);

        return leaderboard;
    }

}