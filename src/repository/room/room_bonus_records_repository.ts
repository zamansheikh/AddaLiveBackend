import mongoose from "mongoose";
import {
  IRoomBonusRecords,
  IRoomBonusRecordsDocument,
  IRoomBonusRecordsModel,
} from "../../models/room/bonus_records_model";
import AppError from "../../core/errors/app_errors";
import { StatusCodes } from "http-status-codes";

export interface IRoomBonusRecordsRepository {
  createRecord(data: IRoomBonusRecords): Promise<IRoomBonusRecordsDocument>;
  readTotalBonus(userId: string): Promise<number>;
}

export default class RoomBonusRecordRepository
  implements IRoomBonusRecordsRepository
{
  Model: IRoomBonusRecordsModel;

  constructor(model: IRoomBonusRecordsModel) {
    this.Model = model;
  }

  async createRecord(
    data: IRoomBonusRecords
  ): Promise<IRoomBonusRecordsDocument> {
    const newRecord = new this.Model(data);
    const saved = await newRecord.save();
    if(!saved) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "creating record failed");
    return saved;
  }

  async readTotalBonus(userId: string): Promise<number> {
    const totalBonus = await this.Model.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          readStatus: false,
        },
      },
      {
        $group: {
          _id: null,
          totalBonus: { $sum: "$bonusDiamonds" },
        },
      },
    ]);
    await this.updateTheReadStatus(userId);
    return totalBonus[0]?.totalBonus ?? 0;
  }

  async updateTheReadStatus(userId: string): Promise<void> {
    const updated = await this.Model.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), readStatus: false },
      { readStatus: true }
    );
    if (!updated) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }
}
