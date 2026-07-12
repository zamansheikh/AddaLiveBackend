import { StatusCodes } from "http-status-codes";
import mongoose, { ClientSession } from "mongoose";
import {
  IUserStats,
  IUSerStatsDocument,
  IUSerStatsModel,
} from "../../entities/userstats/userstats_interface";
import { ILeaderBoardResponse } from "../../services/game/game_service";
import IUserStatsRepository from "./userstats_repository_interface";
import AppError from "../../core/errors/app_errors";

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
  async getUserStatsById(id: string): Promise<IUSerStatsDocument | null> {
    return await this.model.findById(id);
  }
  async getUserStats(id: string, session?: ClientSession): Promise<IUSerStatsDocument | null> {
    const userId = new mongoose.Types.ObjectId(id);
    return await this.model.findOne({ userId }).session(session || null);
  }

  async updateGiftDiamond(
    userIds: string[],
    diamonds: number,
    session?: ClientSession,
  ): Promise<mongoose.UpdateResult> {
    const result = await this.model
      .updateMany(
        { userId: { $in: userIds } },
        { $inc: { diamonds: diamonds } },
      )
      .session(session || null);
    return result;
  }

  async updateCoins(
    userId: string,
    coins: number,
    session?: ClientSession,
  ): Promise<IUSerStatsDocument> {
    const updated = await this.model
      .findOneAndUpdate({ userId }, { $inc: { coins } }, { new: true })
      .session(session || null);
    if (!updated) throw new AppError(500, "Failed to update coins");
    return updated;
  }

  async updateSenderStats(
    userId: string,
    coinsToSub: number,
    diamondsToAdd: number,
    session?: ClientSession,
  ): Promise<IUSerStatsDocument | null> {
    const updated = await this.model
      .findOneAndUpdate(
        { userId, coins: { $gte: coinsToSub } },
        { $inc: { coins: -coinsToSub, diamonds: diamondsToAdd } },
        { new: true },
      )
      .session(session || null);
    if (!updated)
      throw new AppError(StatusCodes.BAD_REQUEST, "not enough coins");
    return updated;
  }

  async balanceDeduction(
    userId: string,
    amount: number,
    session?: ClientSession,
  ): Promise<IUSerStatsDocument | null> {
    const updated = await this.model
      .findOneAndUpdate(
        { userId, coins: { $gte: amount } },
        { $inc: { coins: -amount } },
        { new: true },
      )
      .session(session || null);
    if (!updated)
      throw new AppError(StatusCodes.BAD_REQUEST, "not enough coins");
    return updated;
  }

  async diamondDeduction(
    userId: string,
    amount: number,
    session?: ClientSession,
  ): Promise<IUSerStatsDocument | null> {
    const updated = await this.model
      .findOneAndUpdate(
        { userId, diamonds: { $gte: amount } },
        { $inc: { diamonds: -amount } },
        { new: true },
      )
      .session(session || null);
    if (!updated)
      throw new AppError(StatusCodes.BAD_REQUEST, "not enough diamonds");
    return updated;
  }

  async diamondToCoinExchange(
    userId: string,
    diamondsToDeduct: number,
    coinsToAdd: number,
    session?: ClientSession,
  ): Promise<IUSerStatsDocument | null> {
    const updated = await this.model
      .findOneAndUpdate(
        { userId, diamonds: { $gte: diamondsToDeduct } },
        { $inc: { diamonds: -diamondsToDeduct, coins: coinsToAdd } },
        { new: true },
      )
      .session(session || null);
    if (!updated)
      throw new AppError(StatusCodes.BAD_REQUEST, "not enough diamonds");
    return updated;
  }

  /**
   * Conditionally deduct `amount` of a single currency, atomically.
   *
   * Returns the updated doc, or `null` when the player cannot cover it (or has no
   * stats row at all). Null is a *definitive* "nothing moved" — the caller turns
   * it into a 400 INSUFFICIENT_BALANCE, never a 5xx.
   *
   * Unlike `balanceDeduction`/`diamondDeduction` this does not throw, because the
   * games provider contract needs the outcome as a value, not an exception.
   */
  async debitCurrency(
    userId: string,
    currency: "coins" | "diamonds",
    amount: number,
    session?: ClientSession,
  ): Promise<IUSerStatsDocument | null> {
    return await this.model
      .findOneAndUpdate(
        { userId, [currency]: { $gte: amount } },
        { $inc: { [currency]: -amount } },
        { new: true },
      )
      .session(session || null);
  }

  /**
   * Add `amount` to a single currency, atomically. Upserts the stats row.
   *
   * The upsert matters: a game payout must never be lost because a player somehow
   * has no `userstats` document. Failing here would return a 5xx, which the games
   * backend reads as "outcome unknown" and retries forever — the player's winnings
   * would hang in limbo instead of landing.
   */
  async creditCurrency(
    userId: string,
    currency: "coins" | "diamonds",
    amount: number,
    session?: ClientSession,
  ): Promise<IUSerStatsDocument> {
    const updated = await this.model
      .findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId) },
        { $inc: { [currency]: amount } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .session(session || null);
    if (!updated) throw new AppError(500, `Failed to credit ${currency}`);
    return updated;
  }

  async updateStars(
    userId: string,
    stars: number,
  ): Promise<IUSerStatsDocument | null> {
    return await this.model.findOneAndUpdate(
      { userId },
      { $inc: { stars } },
      { new: true },
    );
  }

  async updateDiamonds(
    userId: string,
    diamonds: number,
    session?: mongoose.ClientSession,
  ): Promise<IUSerStatsDocument | null> {
    return await this.model
      .findOneAndUpdate({ userId }, { $inc: { diamonds } }, { new: true })
      .session(session || null);
  }

  async updateLevels(
    userId: string,
    levels: number,
  ): Promise<IUSerStatsDocument | null> {
    return await this.model.findOneAndUpdate(
      { userId },
      { $inc: { levels } },
      { new: true },
    );
  }

  async updateResellerCoins(
    userId: string,
    coins: number,
    session?: ClientSession,
  ): Promise<IUSerStatsDocument> {
    const updated = await this.model
      .findOneAndUpdate({ userId }, { $inc: { resellerCoin: coins } }, { new: true })
      .session(session || null);
    if (!updated) throw new AppError(500, "Failed to update reseller coins");
    return updated;
  }

  async resellerCoinDeduction(
    userId: string,
    amount: number,
    session?: ClientSession,
  ): Promise<IUSerStatsDocument | null> {
    const updated = await this.model
      .findOneAndUpdate(
        { userId, resellerCoin: { $gte: amount } },
        { $inc: { resellerCoin: -amount } },
        { new: true },
      )
      .session(session || null);
    if (!updated)
      throw new AppError(StatusCodes.BAD_REQUEST, "not enough reseller coins");
    return updated;
  }

  async updateProperty(
    id: string,
    property: Record<string, any>,
  ): Promise<IUSerStatsDocument | null> {
    return await this.model.findOneAndUpdate({ userId: id }, property, {
      new: true,
    });
  }

  async getUserLeaderBoardInfo(
    query: Record<string, string>,
  ): Promise<ILeaderBoardResponse[] | null> {
    const leaderboard = await this.model.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          serial: { $toString: "$_id" },
          user_name: "$user.name",
          profile_image_url: "$user.avatar",
          total_gold: "$coins",
          total_diamond: "$coins",
        },
      },
      {
        $sort: {
          total_diamond: -1, // 👈 sort by diamonds descending
        },
      },
    ]);

    return leaderboard;
  }
}
