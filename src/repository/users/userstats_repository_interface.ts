import { ClientSession, UpdateResult } from "mongoose";
import {
  IUserStats,
  IUSerStatsDocument,
} from "../../entities/userstats/userstats_interface";
import { ILeaderBoardResponse } from "../../services/game/game_service";

export default interface IUserStatsRepository {
  createUserstats(stats: IUserStats): Promise<IUSerStatsDocument | null>;
  getUserStats(id: string, session?: ClientSession): Promise<IUSerStatsDocument | null>;
  getUserStatsById(id: string): Promise<IUSerStatsDocument | null>;
  deleteStats(userId: string): Promise<IUSerStatsDocument | null>;
  updateProperty(
    id: string,
    property: Record<string, any>,
  ): Promise<IUSerStatsDocument | null>;
  updateStars(
    userId: string,
    stars: number,
  ): Promise<IUSerStatsDocument | null>;
  updateCoins(
    userId: string,
    coins: number,
    session?: ClientSession,
  ): Promise<IUSerStatsDocument>;
  updateDiamonds(
    userId: string,
    diamonds: number,
    session?: ClientSession,
  ): Promise<IUSerStatsDocument | null>;
  updateLevels(
    userId: string,
    levels: number,
  ): Promise<IUSerStatsDocument | null>;
  getUserLeaderBoardInfo(
    query: Record<string, string>,
  ): Promise<ILeaderBoardResponse[] | null>;
  updateGiftDiamond(
    userIds: string[],
    diamonds: number,
    session?: ClientSession,
  ): Promise<UpdateResult>;
  updateSenderStats(
    userId: string, // target userId
    coinsToSub: number, // the amount of coins need to be deducted
    diamondsToAdd: number, // the amount of diamonds need to be added
    session?: ClientSession, // session for transaction if any
  ): Promise<IUSerStatsDocument | null>;
  balanceDeduction(
    userId: string,
    amount: number,
    session?: ClientSession,
  ): Promise<IUSerStatsDocument | null>;
  /** Currency-aware conditional deduct. `null` = insufficient balance. */
  debitCurrency(
    userId: string,
    currency: "coins" | "diamonds",
    amount: number,
    session?: ClientSession,
  ): Promise<IUSerStatsDocument | null>;
  /** Currency-aware credit. Upserts the stats row so a payout is never lost. */
  creditCurrency(
    userId: string,
    currency: "coins" | "diamonds",
    amount: number,
    session?: ClientSession,
  ): Promise<IUSerStatsDocument>;
  diamondDeduction(
    userId: string,
    amount: number,
    session?: ClientSession,
  ): Promise<IUSerStatsDocument | null>;
  diamondToCoinExchange(
    userId: string,
    diamondsToDeduct: number,
    coinsToAdd: number,
    session?: ClientSession,
  ): Promise<IUSerStatsDocument | null>;
  updateResellerCoins(
    userId: string,
    coins: number,
    session?: ClientSession,
  ): Promise<IUSerStatsDocument>;
  resellerCoinDeduction(
    userId: string,
    amount: number,
    session?: ClientSession,
  ): Promise<IUSerStatsDocument | null>;
}
