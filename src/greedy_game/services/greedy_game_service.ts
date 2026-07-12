import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import IUserStatsRepository from "../../repository/users/userstats_repository_interface";
import { IUserRepository } from "../../repository/users/user_repository";
import {
  IWalletTransactionDocument,
  TransactionDirection,
} from "../models/wallet_transaction_model";
import { IWalletTransactionRepository } from "../repository/wallet_transaction_repository";
import GamesApiError from "../errors/games_api_error";

/** The only currencies the provider contract carries. */
export type GameCurrency = "coins" | "diamonds";

/** The only transaction types the games backend may send. */
export const ALLOWED_TXN_TYPES = ["game_bet", "game_payout", "refund"] as const;
export type GameTxnType = (typeof ALLOWED_TXN_TYPES)[number];

export interface IWalletMutationRequest {
  userId: string;
  currency: string;
  amount: number;
  type: string;
  idempotencyKey: string;
  description?: string;
  refType?: string;
  refId?: string;
}

/** Kept as the old name so existing imports keep compiling. */
export type IDebitRequest = IWalletMutationRequest;

export interface IWalletBalance {
  coins: number;
  diamonds: number;
  frozen: boolean;
}

export interface IHostUser {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  numericId?: number;
}

export interface IGreedyGameService {
  getUserBalance(userId: string): Promise<IWalletBalance>;
  debit(data: IWalletMutationRequest): Promise<{ status: number; body: any }>;
  credit(data: IWalletMutationRequest): Promise<{ status: number; body: any }>;
  getTransactionByidempotencyKey(idempotencyKey: string): Promise<{ status: number; body: any }>;
  getUserNames(userIds: string[]): Promise<{ status: number; body: any }>;
  searchUsers(query: string): Promise<{ status: number; body: any }>;
  lookupTransactions(txnIds: string[]): Promise<{ status: number; body: any }>;
}

const MONGO_DUPLICATE_KEY = 11000;
const MONGO_WRITE_CONFLICT = 112;
const MONGO_LOCK_TIMEOUT = 24;
const MAX_TXN_ATTEMPTS = 5;

/**
 * MongoDB aborts a transaction that races another transaction for the same
 * document and expects the CLIENT to retry — the write simply did not happen.
 *
 * This is not exotic: two bets by the same player in one round both touch that
 * player's single `userstats` row. Without a retry they collide, we report a 5xx,
 * and the games backend has to treat a bet that plainly never applied as an
 * unknown outcome and reconcile it later.
 */
function isTransient(error: any): boolean {
  if (Array.isArray(error?.errorLabels) && error.errorLabels.includes("TransientTransactionError")) {
    return true;
  }
  return (
    error?.code === MONGO_WRITE_CONFLICT ||
    error?.code === MONGO_LOCK_TIMEOUT ||
    error?.codeName === "WriteConflict"
  );
}

function backoffMs(attempt: number): number {
  // Jittered, so a burst of retries doesn't re-collide in lockstep.
  return attempt * 20 + Math.floor(Math.random() * 20);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Adda's half of the games provider contract.
 *
 * The games backend holds no money. It bets, pays out and refunds by calling the
 * five `/internal/wallet/*` + `/internal/users/*` endpoints here, and Adda stays
 * the single source of truth for every coin.
 *
 * THE RULE THAT GOVERNS THIS FILE: the HTTP status is what tells the games backend
 * whether money moved.
 *
 *   2xx → the coins MOVED
 *   4xx → the coins DEFINITELY DID NOT move (games gives up, tells the player)
 *   5xx → UNKNOWN (games reconciles later via the idempotency key)
 *
 * Never return a 4xx once coins have been taken. When in doubt, throw — an
 * unclassified throw becomes a 500, and 500 is the honest answer for "unknown".
 */
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

  // ─── Wallet ────────────────────────────────────────────────────────────────

  async getUserBalance(userId: string): Promise<IWalletBalance> {
    this.assertUserId(userId);

    const userStats = await this.UserStatsRepo.getUserStats(userId);

    if (!userStats) {
      // No stats row is not automatically an error — but a userId that isn't a
      // real player is. Distinguish, so a genuinely bad id can't read as "0 coins".
      const user = await this.UserRepo.findUserById(userId);
      if (!user) {
        throw new GamesApiError(
          StatusCodes.NOT_FOUND,
          "USER_NOT_FOUND",
          "No such player",
        );
      }
      return { coins: 0, diamonds: 0, frozen: false };
    }

    return {
      coins: userStats.coins ?? 0,
      diamonds: userStats.diamonds ?? 0,
      // Adda has no wallet-freeze flag today. When one exists, set it here and
      // the games backend will block bets on its own — see WALLET_FROZEN.
      frozen: false,
    };
  }

  async debit(data: IWalletMutationRequest): Promise<{ status: number; body: any }> {
    return this.mutate("debit", data);
  }

  async credit(data: IWalletMutationRequest): Promise<{ status: number; body: any }> {
    return this.mutate("credit", data);
  }

  private async mutate(
    direction: TransactionDirection,
    data: IWalletMutationRequest,
  ): Promise<{ status: number; body: any }> {
    this.assertUserId(data.userId);
    const currency = this.assertCurrency(data.currency);
    const amount = this.assertAmount(data.amount);
    const type = this.assertType(data.type);
    this.assertIdempotencyKey(data.idempotencyKey);

    // Fast path for an honest retry. Racing duplicates slip past this — the unique
    // index below is what actually stops the double charge.
    const replay = await this.WalletTransactionRepo.findByIdempotencyKey(
      data.idempotencyKey,
    );
    if (replay) return this.applied(replay);

    for (let attempt = 1; ; attempt++) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        let balanceAfter: number;

        if (direction === "debit") {
          const stats = await this.UserStatsRepo.debitCurrency(
            data.userId,
            currency,
            amount,
            session,
          );
          if (!stats) {
            // Definitive: the conditional update matched nothing, so nothing moved.
            await session.abortTransaction();
            return {
              status: StatusCodes.BAD_REQUEST,
              body: {
                success: false,
                error: {
                  code: "INSUFFICIENT_BALANCE",
                  message: `Not enough ${currency}`,
                },
              },
            };
          }
          balanceAfter = stats[currency] ?? 0;
        } else {
          const stats = await this.UserStatsRepo.creditCurrency(
            data.userId,
            currency,
            amount,
            session,
          );
          balanceAfter = stats[currency] ?? 0;
        }

        const transaction = await this.WalletTransactionRepo.create(
          {
            userId: data.userId,
            currency,
            amount,
            type,
            direction,
            balanceAfter,
            idempotencyKey: data.idempotencyKey,
            description: data.description,
            refType: data.refType,
            refId: data.refId,
          },
          session,
        );

        await session.commitTransaction();
        return this.applied(transaction);
      } catch (error: any) {
        await session.abortTransaction().catch(() => undefined);

        // Two copies of the same request raced and both passed the findOne above.
        // The unique index rejected the loser, and its balance change rolled back
        // with the transaction — so the winner's row is the single real outcome.
        // Returning it is a successful idempotent replay, not a failure.
        if (error?.code === MONGO_DUPLICATE_KEY) {
          const winner = await this.WalletTransactionRepo.findByIdempotencyKey(
            data.idempotencyKey,
          );
          if (winner) return this.applied(winner);
        }

        // The transaction aborted without applying anything. Retrying is safe and
        // correct — and it is what keeps a same-player collision from surfacing as
        // an "unknown outcome" the games backend has to reconcile.
        if (isTransient(error) && attempt < MAX_TXN_ATTEMPTS) {
          // A racing duplicate may have committed while we were unwinding.
          const winner = await this.WalletTransactionRepo.findByIdempotencyKey(
            data.idempotencyKey,
          );
          if (winner) return this.applied(winner);

          await sleep(backoffMs(attempt));
          continue;
        }

        // Anything else — including a failed commit — leaves the outcome genuinely
        // unknown. Let it become a 500 so games reconciles instead of guessing.
        throw error;
      } finally {
        session.endSession();
      }
    }
  }

  async getTransactionByidempotencyKey(
    idempotencyKey: string,
  ): Promise<{ status: number; body: any }> {
    const transaction = await this.WalletTransactionRepo.findByIdempotencyKey(
      idempotencyKey,
    );

    // 200 even on a miss — this is a QUESTION ("did you apply this key?"), and
    // `applied: false` is a valid, definitive answer. A 404 here would read as a
    // hard 4xx failure on the games side and strand its bet-recovery, which is
    // the one caller that can refund a player whose debit timed out.
    if (!transaction) {
      return {
        status: StatusCodes.OK,
        body: { applied: false, txn: null },
      };
    }

    return {
      status: StatusCodes.OK,
      body: { applied: true, txn: this.toHostTransaction(transaction) },
    };
  }

  async lookupTransactions(txnIds: string[]): Promise<{ status: number; body: any }> {
    const ids = [...new Set(txnIds.filter(Boolean).map(String))].filter((id) =>
      mongoose.Types.ObjectId.isValid(id),
    );

    if (ids.length === 0) return { status: StatusCodes.OK, body: { txns: [] } };

    const transactions = await this.WalletTransactionRepo.findByIds(ids);

    return {
      status: StatusCodes.OK,
      body: { txns: transactions.map((t) => this.toHostTransaction(t)) },
    };
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  async getUserNames(userIds: string[]): Promise<{ status: number; body: any }> {
    // Drop malformed ids rather than 400 the whole batch: this is a best-effort
    // read on the games side and one bad id must not blank out a leaderboard.
    const ids = [...new Set(userIds.filter(Boolean).map(String))].filter((id) =>
      mongoose.Types.ObjectId.isValid(id),
    );

    if (ids.length === 0) return { status: StatusCodes.OK, body: { users: [] } };

    const users = await this.UserRepo.findUsersByIds(ids);

    return {
      status: StatusCodes.OK,
      body: { users: users.map((user) => this.toHostUser(user)) },
    };
  }

  async searchUsers(query: string): Promise<{ status: number; body: any }> {
    const users = await this.UserRepo.searchUsers(query, 20);

    return {
      status: StatusCodes.OK,
      body: { users: users.map((user) => this.toHostUser(user)) },
    };
  }

  // ─── Mapping ───────────────────────────────────────────────────────────────

  private applied(transaction: IWalletTransactionDocument) {
    return {
      status: StatusCodes.OK,
      body: { txn: { id: (transaction._id as any).toString() } },
    };
  }

  private toHostTransaction(t: IWalletTransactionDocument) {
    return {
      id: (t._id as any).toString(),
      userId: (t.userId as any).toString(),
      amount: t.amount,
      currency: t.currency,
      type: t.type,
      // Rows written before `direction` existed still need one — a bet is the
      // only debit the games backend ever asks for.
      direction: t.direction ?? (t.type === "game_bet" ? "debit" : "credit"),
      balanceAfter: t.balanceAfter ?? null,
      createdAt: t.createdAt,
    };
  }

  private toHostUser(user: any): IHostUser {
    return {
      userId: (user._id as any).toString(),
      displayName: user.name ?? "",
      username: user.username ?? "",
      avatarUrl: user.avatar ?? "",
      numericId: user.userId,
    };
  }

  // ─── Validation ────────────────────────────────────────────────────────────
  //
  // All of these run BEFORE any coins move, so a 400 from here is always
  // truthfully "nothing happened". They also stop a malformed id reaching
  // Mongoose, whose CastError would otherwise surface as an ambiguous 500.

  private assertUserId(userId: string): void {
    if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
      throw new GamesApiError(
        StatusCodes.BAD_REQUEST,
        "INVALID_USER_ID",
        "userId must be a 24-character ObjectId",
      );
    }
  }

  private assertCurrency(currency: string): GameCurrency {
    if (currency !== "coins" && currency !== "diamonds") {
      throw new GamesApiError(
        StatusCodes.BAD_REQUEST,
        "INVALID_CURRENCY",
        "currency must be 'coins' or 'diamonds'",
      );
    }
    return currency;
  }

  private assertAmount(amount: number): number {
    const value = Number(amount);
    if (!Number.isInteger(value) || value < 1) {
      throw new GamesApiError(
        StatusCodes.BAD_REQUEST,
        "INVALID_AMOUNT",
        "amount must be a positive integer",
      );
    }
    return value;
  }

  private assertType(type: string): GameTxnType {
    if (!ALLOWED_TXN_TYPES.includes(type as GameTxnType)) {
      throw new GamesApiError(
        StatusCodes.BAD_REQUEST,
        "INVALID_TYPE",
        `type must be one of: ${ALLOWED_TXN_TYPES.join(", ")}`,
      );
    }
    return type as GameTxnType;
  }

  private assertIdempotencyKey(key: string): void {
    if (!key || typeof key !== "string") {
      throw new GamesApiError(
        StatusCodes.BAD_REQUEST,
        "INVALID_IDEMPOTENCY_KEY",
        "idempotencyKey is required",
      );
    }
  }
}
