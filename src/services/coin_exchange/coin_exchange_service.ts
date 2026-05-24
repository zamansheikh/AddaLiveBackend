import mongoose from "mongoose";
import AppError from "../../core/errors/app_errors";
import { IExchangeOption, IExchangeOptionDocument } from "../../models/coin_exchange/exchange_option_model";
import { IExchangeTransactionHistory, IExchangeTransactionHistoryDocument } from "../../models/coin_exchange/exchange_transaction_history_model";
import { RepositoryProviders } from "../../core/providers/repository_providers";

export interface ICoinExchangeService {
  createExchangeOption(data: IExchangeOption): Promise<IExchangeOptionDocument>;
  getAllExchangeOptions(): Promise<IExchangeOptionDocument[]>;
  updateExchangeOption(id: string, data: Partial<IExchangeOption>): Promise<IExchangeOptionDocument>;
  deleteExchangeOption(id: string): Promise<boolean>;
  exchangeDiamondsToCoins(userId: string, optionId: string, idempotencyKey: string): Promise<IExchangeTransactionHistoryDocument>;
  getMyHistory(userId: string): Promise<IExchangeTransactionHistoryDocument[]>;
  getAllHistory(): Promise<IExchangeTransactionHistoryDocument[]>;
}

export class CoinExchangeService implements ICoinExchangeService {
  private exchangeOptionRepository = RepositoryProviders.exchangeOptionRepositoryProvider;
  private historyRepository = RepositoryProviders.exchangeTransactionHistoryRepositoryProvider;
  private userRepository = RepositoryProviders.userRepositoryProvider;
  private userStatsRepository = RepositoryProviders.userStatsRepositoryProvider;

  constructor() { }

  async createExchangeOption(data: IExchangeOption): Promise<IExchangeOptionDocument> {
    if (data.diamondsRequired <= 0) {
      throw new AppError(400, "diamondsRequired must be a positive number");
    }
    if (data.coinsAwarded <= 0) {
      throw new AppError(400, "coinsAwarded must be a positive number");
    }
    if (data.bonusCoins < 0) {
      throw new AppError(400, "bonusCoins must be a non-negative number");
    }
    if (data.displayOrder < 0) {
      throw new AppError(400, "displayOrder must be a non-negative number");
    }

    // Check for displayOrder conflict
    const existingDisplayOrder = await this.exchangeOptionRepository.findByDisplayOrder(data.displayOrder);
    if (existingDisplayOrder) {
      throw new AppError(409, `An exchange option with display order ${data.displayOrder} already exists`);
    }

    // Check for diamondsRequired conflict
    const existingDiamondsRequired = await this.exchangeOptionRepository.findByDiamondsRequired(data.diamondsRequired);
    if (existingDiamondsRequired) {
      throw new AppError(409, `An exchange option requiring ${data.diamondsRequired} diamonds already exists`);
    }

    return await this.exchangeOptionRepository.create(data);
  }

  async getAllExchangeOptions(): Promise<IExchangeOptionDocument[]> {
    return await this.exchangeOptionRepository.findAll();
  }

  async updateExchangeOption(id: string, data: Partial<IExchangeOption>): Promise<IExchangeOptionDocument> {
    const existingOption = await this.exchangeOptionRepository.findById(id);
    if (!existingOption) {
      throw new AppError(404, "Exchange option not found");
    }

    if (data.diamondsRequired !== undefined && data.diamondsRequired <= 0) {
      throw new AppError(400, "diamondsRequired must be a positive number");
    }
    if (data.coinsAwarded !== undefined && data.coinsAwarded <= 0) {
      throw new AppError(400, "coinsAwarded must be a positive number");
    }
    if (data.bonusCoins !== undefined && data.bonusCoins < 0) {
      throw new AppError(400, "bonusCoins must be a non-negative number");
    }
    if (data.displayOrder !== undefined && data.displayOrder < 0) {
      throw new AppError(400, "displayOrder must be a non-negative number");
    }

    if (data.displayOrder !== undefined) {
      const existingDisplayOrder = await this.exchangeOptionRepository.findByDisplayOrder(data.displayOrder);
      if (existingDisplayOrder && (existingDisplayOrder._id as any).toString() !== id) {
        throw new AppError(409, `An exchange option with display order ${data.displayOrder} already exists`);
      }
    }

    if (data.diamondsRequired !== undefined) {
      const existingDiamondsRequired = await this.exchangeOptionRepository.findByDiamondsRequired(data.diamondsRequired);
      if (existingDiamondsRequired && (existingDiamondsRequired._id as any).toString() !== id) {
        throw new AppError(409, `An exchange option requiring ${data.diamondsRequired} diamonds already exists`);
      }
    }

    return await this.exchangeOptionRepository.update(id, data);
  }

  async deleteExchangeOption(id: string): Promise<boolean> {
    const existingOption = await this.exchangeOptionRepository.findById(id);
    if (!existingOption) {
      throw new AppError(404, "Exchange option not found");
    }

    return await this.exchangeOptionRepository.delete(id);
  }

  async exchangeDiamondsToCoins(userId: string, optionId: string, idempotencyKey: string): Promise<IExchangeTransactionHistoryDocument> {
    const existingTx = await this.historyRepository.findByIdempotencyKey(idempotencyKey);
    if (existingTx) {
      return existingTx;
    }

    const option = await this.exchangeOptionRepository.findById(optionId);
    if (!option) {
      throw new AppError(404, "Exchange option not found");
    }
    if (!option.isActive) {
      throw new AppError(400, "Exchange option is not active");
    }

    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userStats = await this.userStatsRepository.getUserStats(userId, session);
      if (!userStats) {
        throw new AppError(404, "User stats not found");
      }

      if ((userStats.diamonds ?? 0) < option.diamondsRequired) {
        throw new AppError(400, "Insufficient diamonds balance");
      }

      const totalCoins = option.coinsAwarded + option.bonusCoins;

      // Deduct diamonds (pass negative value to $inc)
      await this.userStatsRepository.updateDiamonds(userId, -option.diamondsRequired, session);
      // Add coins (pass positive value to $inc)
      await this.userStatsRepository.updateCoins(userId, totalCoins, session);

      const historyLog = await this.historyRepository.create({
        userId,
        exchangeOptionId: optionId,
        diamondsDeducted: option.diamondsRequired,
        coinsAwarded: option.coinsAwarded,
        bonusCoins: option.bonusCoins,
        idempotencyKey,
      }, session);

      await session.commitTransaction();
      return historyLog;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getMyHistory(userId: string): Promise<IExchangeTransactionHistoryDocument[]> {
    return await this.historyRepository.findByUserId(userId);
  }

  async getAllHistory(): Promise<IExchangeTransactionHistoryDocument[]> {
    return await this.historyRepository.findAll();
  }
}
