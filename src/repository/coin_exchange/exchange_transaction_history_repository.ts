import mongoose from "mongoose";
import AppError from "../../core/errors/app_errors";
import ExchangeTransactionHistoryModel, {
  IExchangeTransactionHistory,
  IExchangeTransactionHistoryDocument,
  IExchangeTransactionHistoryModel,
} from "../../models/coin_exchange/exchange_transaction_history_model";

export interface IExchangeTransactionHistoryRepository {
  create(data: IExchangeTransactionHistory, session?: mongoose.ClientSession): Promise<IExchangeTransactionHistoryDocument>;
  findAll(): Promise<IExchangeTransactionHistoryDocument[]>;
  findById(id: string): Promise<IExchangeTransactionHistoryDocument>;
  findByUserId(userId: string): Promise<IExchangeTransactionHistoryDocument[]>;
  findByIdempotencyKey(idempotencyKey: string): Promise<IExchangeTransactionHistoryDocument | null>;
  update(id: string, data: Partial<IExchangeTransactionHistory>): Promise<IExchangeTransactionHistoryDocument>;
  delete(id: string): Promise<boolean>;
}

export default class ExchangeTransactionHistoryRepository
  implements IExchangeTransactionHistoryRepository
{
  private Model: IExchangeTransactionHistoryModel;

  constructor(
    model: IExchangeTransactionHistoryModel = ExchangeTransactionHistoryModel
  ) {
    this.Model = model;
  }

  async create(
    data: IExchangeTransactionHistory,
    session?: mongoose.ClientSession
  ): Promise<IExchangeTransactionHistoryDocument> {
    const docs = await this.Model.create([data], { session });
    return docs[0];
  }

  async findByIdempotencyKey(
    idempotencyKey: string
  ): Promise<IExchangeTransactionHistoryDocument | null> {
    return await this.Model.findOne({ idempotencyKey });
  }

  async findByUserId(
    userId: string
  ): Promise<IExchangeTransactionHistoryDocument[]> {
    return await this.Model.find({ userId }).sort({ createdAt: -1 });
  }

  async findAll(): Promise<IExchangeTransactionHistoryDocument[]> {
    return await this.Model.find().sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<IExchangeTransactionHistoryDocument> {
    const document = await this.Model.findById(id);
    if (!document) {
      throw new AppError(404, "Exchange transaction history not found");
    }
    return document;
  }

  async update(
    id: string,
    data: Partial<IExchangeTransactionHistory>
  ): Promise<IExchangeTransactionHistoryDocument> {
    const updatedDocument = await this.Model.findByIdAndUpdate(id, data, {
      new: true,
      upsert: false,
    });
    if (!updatedDocument) {
      throw new AppError(404, "Exchange transaction history not found");
    }
    return updatedDocument;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.Model.findByIdAndDelete(id);
    return result != null;
  }
}
