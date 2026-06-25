import {
  IFamilySupportRewardHistory,
  IFamilySupportRewardHistoryDocument,
  IFamilySupportRewardHistoryModel,
} from "../../models/family/family_support_reward_history_model";

export interface IFamilySupportRewardHistoryRepository {
  create(
    data: IFamilySupportRewardHistory,
  ): Promise<IFamilySupportRewardHistoryDocument>;
  getByFamilyAndWeek(
    familyId: string,
    weekStart: Date,
  ): Promise<IFamilySupportRewardHistoryDocument | null>;
}

export class FamilySupportRewardHistoryRepository
  implements IFamilySupportRewardHistoryRepository
{
  model: IFamilySupportRewardHistoryModel;

  constructor(model: IFamilySupportRewardHistoryModel) {
    this.model = model;
  }

  async create(
    data: IFamilySupportRewardHistory,
  ): Promise<IFamilySupportRewardHistoryDocument> {
    const doc = new this.model(data);
    return await doc.save();
  }

  async getByFamilyAndWeek(
    familyId: string,
    weekStart: Date,
  ): Promise<IFamilySupportRewardHistoryDocument | null> {
    return await this.model.findOne({ familyId, weekStart });
  }
}
