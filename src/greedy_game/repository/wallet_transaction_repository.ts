import { ClientSession } from "mongoose";
import {
  IWalletTransaction,
  IWalletTransactionDocument,
  IWalletTransactionModel,
} from "../models/wallet_transaction_model";

export interface IWalletTransactionRepository {
  create(data: IWalletTransaction, session?: ClientSession): Promise<IWalletTransactionDocument>;
  findByIdempotencyKey(
    idempotencyKey: string,
    session?: ClientSession,
  ): Promise<IWalletTransactionDocument | null>;
  findByIds(ids: string[]): Promise<IWalletTransactionDocument[]>;
}

export default class WalletTransactionRepository implements IWalletTransactionRepository {
  Model: IWalletTransactionModel;

  constructor(Model: IWalletTransactionModel) {
    this.Model = Model;
  }

  async create(data: IWalletTransaction, session?: ClientSession): Promise<IWalletTransactionDocument> {
    const transaction = new this.Model(data);
    return await transaction.save({ session });
  }

  /**
   * Read from the PRIMARY, always.
   *
   * This backs `GET /internal/wallet/transaction/:idempotencyKey`, which the games
   * backend calls to settle "my debit timed out — did the coins actually move?".
   * A stale secondary answering `applied: false` for a debit that did commit would
   * make games refund a stake it never lost. `applied: false` must mean *definitely
   * not applied*, never *not visible yet*.
   */
  async findByIdempotencyKey(
    idempotencyKey: string,
    session?: ClientSession,
  ): Promise<IWalletTransactionDocument | null> {
    return await this.Model.findOne({ idempotencyKey })
      .read("primary")
      .session(session || null);
  }

  async findByIds(ids: string[]): Promise<IWalletTransactionDocument[]> {
    return await this.Model.find({ _id: { $in: ids } });
  }
}
