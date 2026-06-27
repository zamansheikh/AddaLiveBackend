import {
  IFamilySupportReward,
  IFamilySupportRewardDocument,
  IFamilySupportRewardModel,
} from "../../models/family/family_support_reward_model";

export interface IFamilySupportRewardRepository {
  getAll(): Promise<IFamilySupportRewardDocument[]>;
  getByLevel(level: number): Promise<IFamilySupportRewardDocument | null>;
  updateByLevel(
    level: number,
    data: Partial<IFamilySupportReward>,
  ): Promise<IFamilySupportRewardDocument | null>;
  getNextLevelInfo(
    currentContribution: number,
  ): Promise<{ nextLevel: number | null; nextLevelTarget: number | null }>;
}

export class FamilySupportRewardRepository
  implements IFamilySupportRewardRepository
{
  model: IFamilySupportRewardModel;

  constructor(model: IFamilySupportRewardModel) {
    this.model = model;
  }

  async getAll(): Promise<IFamilySupportRewardDocument[]> {
    return await this.model.find().sort({ level: 1 });
  }

  async getByLevel(level: number): Promise<IFamilySupportRewardDocument | null> {
    return await this.model.findOne({ level });
  }

  async updateByLevel(
    level: number,
    data: Partial<IFamilySupportReward>,
  ): Promise<IFamilySupportRewardDocument | null> {
    return await this.model.findOneAndUpdate({ level }, data, { new: true });
  }

  async getNextLevelInfo(
    currentContribution: number,
  ): Promise<{ nextLevel: number | null; nextLevelTarget: number | null }> {
    const levels = await this.getAll();
    if (levels.length === 0) {
      return { nextLevel: null, nextLevelTarget: null };
    }

    const next = levels.find((l) => l.targetPoints > currentContribution);

    if (next) {
      return { nextLevel: next.level, nextLevelTarget: next.targetPoints };
    }

    const max = levels[levels.length - 1];
    return { nextLevel: max.level, nextLevelTarget: max.targetPoints };
  }
}
