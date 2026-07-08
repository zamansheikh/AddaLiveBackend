import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import IUserStatsRepository from "../../repository/users/userstats_repository_interface";
import {
  IWalletTransaction,
  IWalletTransactionDocument,
} from "../models/wallet_transaction_model";
import { IWalletTransactionRepository } from "../repository/wallet_transaction_repository";

export interface IDebitRequest {
  userId: string;
  currency: string;
  amount: number;
  type: string;
  idempotencyKey: string;
  description: string;
  refType: string;
  refId: string;
}

export interface IGreedyGameService {
  getUserBalance(userId: string): Promise<{ coins: number; diamonds: number; frozen: boolean }>;
  debit(data: IDebitRequest): Promise<{ status: number; body: any }>;
}

export default class GreedyGameService implements IGreedyGameService {
  UserStatsRepo: IUserStatsRepository;
  WalletTransactionRepo: IWalletTransactionRepository;

  constructor(
    UserStatsRepo: IUserStatsRepository,
    WalletTransactionRepo: IWalletTransactionRepository,
  ) {
    this.UserStatsRepo = UserStatsRepo;
    this.WalletTransactionRepo = WalletTransactionRepo;
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

  async debit(data: IDebitRequest): Promise<{ status: number; body: any }> {
    const existing = await this.WalletTransactionRepo.findByIdempotencyKey(data.idempotencyKey);
    if (existing) {
      return { status: 200, body: { txn: { id: (existing._id as any).toString() } } };
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      try {
        await this.UserStatsRepo.balanceDeduction(data.userId, data.amount, session);
      } catch (error) {
        await session.abortTransaction();
        return {
          status: 400,
          body: {
            success: false,
            error: { code: "INSUFFICIENT_BALANCE", message: "Not enough coins" },
          },
        };
      }

      const transaction = await this.WalletTransactionRepo.create({
        userId: data.userId,
        currency: data.currency,
        amount: data.amount,
        type: data.type,
        idempotencyKey: data.idempotencyKey,
        description: data.description,
        refType: data.refType,
        refId: data.refId,
      }, session);

      await session.commitTransaction();
      return {
        status: 200,
        body: { txn: { id: (transaction._id as any).toString() } },
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
