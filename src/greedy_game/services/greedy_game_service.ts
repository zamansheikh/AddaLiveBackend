import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import IUserStatsRepository from "../../repository/users/userstats_repository_interface";
import { IUserRepository } from "../../repository/users/user_repository";
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
  credit(data: IDebitRequest): Promise<{ status: number; body: any }>;
  getTransactionByidempotencyKey(idempotencyKey: string): Promise<{ status: number; body: any }>;
  getUserNames(userIds: string[]): Promise<{ status: number; body: any }>;
}

export default class GreedyGameService implements IGreedyGameService {
  UserStatsRepo: IUserStatsRepository;
  WalletTransactionRepo: IWalletTransactionRepository;
  UserRepo: IUserRepository;

  constructor(
    UserStatsRepo: IUserStatsRepository,
    WalletTransactionRepo: IWalletTransactionRepository,
    UserRepo: IUserRepository,
  ) {
    this.UserStatsRepo = UserStatsRepo;
    this.WalletTransactionRepo = WalletTransactionRepo;
    this.UserRepo = UserRepo;
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

  async credit(data: IDebitRequest): Promise<{ status: number; body: any }> {
    const existing = await this.WalletTransactionRepo.findByIdempotencyKey(data.idempotencyKey);
    if (existing) {
      return { status: 200, body: { txn: { id: (existing._id as any).toString() } } };
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await this.UserStatsRepo.updateCoins(data.userId, data.amount, session);

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

  async getTransactionByidempotencyKey(idempotencyKey: string): Promise<{ status: number; body: any }> {
    const transaction = await this.WalletTransactionRepo.findByIdempotencyKey(idempotencyKey);

    if (!transaction) {
      return {
        status: 404,
        body: { applied: false, txn: null },
      };
    }

    return {
      status: 200,
      body: {
        applied: true,
        txn: {
          id: (transaction._id as any).toString(),
          userId: (transaction.userId as any).toString(),
          amount: transaction.amount,
          currency: transaction.currency,
          type: transaction.type,
          createdAt: transaction.createdAt,
        },
      },
    };
  }

  async getUserNames(userIds: string[]): Promise<{ status: number; body: any }> {
    const users = await this.UserRepo.findUsersByIds(userIds);

    return {
      status: 200,
      body: {
        users: users.map((user) => ({
          userId: (user._id as any).toString(),
          displayName: user.name ?? "",
          username: user.username ?? "",
          avatarUrl: user.avatar ?? "",
          numericId: user.userId,
        })),
      },
    };
  }
}
