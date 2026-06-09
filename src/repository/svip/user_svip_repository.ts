import { Model, ClientSession, Types } from "mongoose";
import {
  IUserSvip,
  IUserSvipDocument,
} from "../../models/svip/user_svip_model";

export interface IUserSvipRepository {
  findByUserId(
    userId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<IUserSvipDocument | null>;

  upsert(
    userId: string | Types.ObjectId,
    data: Partial<IUserSvip>,
    session?: ClientSession,
  ): Promise<IUserSvipDocument>;

  /**
   * Atomically increments monthlyRechargeCoins.
   * Also sets month/year/tierStartOfMonth on first creation or month boundary.
   * Uses $inc so concurrent recharges don't overwrite each other.
   */
  incMonthlyRecharge(
    userId: string | Types.ObjectId,
    coins: number,
    currentTier: number,
    tierStartOfMonth: number,
    month: number,
    year: number,
    session?: ClientSession,
  ): Promise<IUserSvipDocument>;

  /**
   * Atomically sets the currentTier (called after milestone check).
   */
  setTier(
    userId: string | Types.ObjectId,
    tier: number,
    session?: ClientSession,
  ): Promise<void>;

  /**
   * Returns all users whose current SVIP tier is greater than 0.
   * Used by the month-end retention cron job.
   */
  findAllActiveSvipUsers(
    session?: ClientSession,
  ): Promise<IUserSvipDocument[]>;

  /**
   * Bulk-updates monthly tracking fields for the new month.
   * Sets monthlyRechargeCoins to 0 and adjusts tierStartOfMonth.
   */
  bulkResetForNewMonth(
    updates: {
      userId: string | Types.ObjectId;
      currentTier: number;
      tierStartOfMonth: number;
    }[],
    session?: ClientSession,
  ): Promise<void>;
}

export class UserSvipRepository implements IUserSvipRepository {
  constructor(private model: Model<IUserSvipDocument>) {}

  async findByUserId(
    userId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<IUserSvipDocument | null> {
    return await this.model
      .findOne({ userId })
      .session(session || null);
  }

  async upsert(
    userId: string | Types.ObjectId,
    data: Partial<IUserSvip>,
    session?: ClientSession,
  ): Promise<IUserSvipDocument> {
    return (await this.model
      .findOneAndUpdate({ userId }, { $set: data }, { new: true, upsert: true })
      .session(session || null)) as IUserSvipDocument;
  }

  async incMonthlyRecharge(
    userId: string | Types.ObjectId,
    coins: number,
    currentTier: number,
    tierStartOfMonth: number,
    month: number,
    year: number,
    session?: ClientSession,
  ): Promise<IUserSvipDocument> {
    return (await this.model
      .findOneAndUpdate(
        { userId },
        {
          $inc: { monthlyRechargeCoins: coins },
          $setOnInsert: {
            userId,
            currentTier,
            tierStartOfMonth,
            month,
            year,
          },
        },
        { new: true, upsert: true },
      )
      .session(session || null)) as IUserSvipDocument;
  }

  async setTier(
    userId: string | Types.ObjectId,
    tier: number,
    session?: ClientSession,
  ): Promise<void> {
    // Only update if the new tier is higher — prevents a concurrent
    // slower request from downgrading a tier that was just upgraded.
    await this.model
      .updateOne({ userId, currentTier: { $lt: tier } }, { $set: { currentTier: tier } })
      .session(session || null);
  }

  async findAllActiveSvipUsers(
    session?: ClientSession,
  ): Promise<IUserSvipDocument[]> {
    return await this.model
      .find({ currentTier: { $gt: 0 } })
      .session(session || null);
  }

  async bulkResetForNewMonth(
    updates: {
      userId: string | Types.ObjectId;
      currentTier: number;
      tierStartOfMonth: number;
    }[],
    session?: ClientSession,
  ): Promise<void> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const operations = updates.map((u) => ({
      updateOne: {
        filter: { userId: u.userId },
        update: {
          $set: {
            currentTier: u.currentTier,
            tierStartOfMonth: u.tierStartOfMonth,
            monthlyRechargeCoins: 0,
            month,
            year,
          },
        },
      },
    }));

    if (operations.length > 0) {
      await this.model.bulkWrite(operations, { session: session || undefined });
    }
  }
}
