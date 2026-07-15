import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import {
  IMedal,
  IMedalDocument,
  IMedalModel,
} from "../../models/medal/medal_model";
import User from "../../models/user/user_model";

export interface IMedalWithStatus extends IMedalDocument {
  acquired: boolean;
  earnedAt?: Date;
}

export interface IMedalRepository {
  create(data: IMedal): Promise<IMedalDocument>;
  findAll(): Promise<IMedalDocument[]>;
  findById(id: string): Promise<IMedalDocument | null>;
  findByLevel(level: number): Promise<IMedalDocument | null>;
  update(id: string, data: Partial<IMedal>): Promise<IMedalDocument>;
  delete(id: string): Promise<IMedalDocument>;
  findMedalsWithUserStatus(userId: string): Promise<IMedalWithStatus[]>;
}

export default class MedalRepository implements IMedalRepository {
  Model: IMedalModel;

  constructor(Model: IMedalModel) {
    this.Model = Model;
  }

  async create(data: IMedal): Promise<IMedalDocument> {
    const medal = new this.Model(data);
    return await medal.save();
  }

  async findAll(): Promise<IMedalDocument[]> {
    return await this.Model.find().sort({ level: 1 });
  }

  async findById(id: string): Promise<IMedalDocument | null> {
    return await this.Model.findById(id);
  }

  async findByLevel(level: number): Promise<IMedalDocument | null> {
    return await this.Model.findOne({ level });
  }

  async update(id: string, data: Partial<IMedal>): Promise<IMedalDocument> {
    const updated = await this.Model.findByIdAndUpdate(id, data, {
      new: true,
    });
    if (!updated) {
      throw new AppError(StatusCodes.NOT_FOUND, "Medal not found");
    }
    return updated;
  }

  async delete(id: string): Promise<IMedalDocument> {
    const deleted = await this.Model.findByIdAndDelete(id);
    if (!deleted) {
      throw new AppError(StatusCodes.NOT_FOUND, "Medal not found");
    }
    return deleted;
  }

  async findMedalsWithUserStatus(userId: string): Promise<IMedalWithStatus[]> {
    const [medals, user] = await Promise.all([
      this.Model.find().sort({ level: 1 }),
      User.findById(userId).select("earnedMedals"),
    ]);

    const earnedMedalMap = new Map<string, Date>();
    if (user?.earnedMedals) {
      for (const entry of user.earnedMedals) {
        earnedMedalMap.set(entry.medalId.toString(), entry.earnedAt);
      }
    }

    return medals.map((medal) => {
      const medalId = (medal._id as unknown as { toString(): string }).toString();
      const earnedAt = earnedMedalMap.get(medalId);
      return {
        ...(medal.toObject() as IMedal & { _id: unknown }),
        acquired: !!earnedAt,
        ...(earnedAt && { earnedAt }),
      } as IMedalWithStatus;
    });
  }
}
