import SvipConfigModel, {
  ISvipConfig,
  ISvipConfigDocument,
  ISvipConfigModel,
} from "../../models/admin/svip_config_model";

export interface ISvipConfigRepository {
  getConfig(): Promise<ISvipConfigDocument | null>;
  updateConfig(data: Partial<ISvipConfig>): Promise<ISvipConfigDocument>;
}

export class SvipConfigRepository implements ISvipConfigRepository {
  private Model: ISvipConfigModel;

  constructor(model: ISvipConfigModel) {
    this.Model = model;
  }

  async getConfig(): Promise<ISvipConfigDocument | null> {
    return await this.Model.findOne();
  }

  async updateConfig(data: Partial<ISvipConfig>): Promise<ISvipConfigDocument> {
    return (await this.Model.findOneAndUpdate(
      {},
      { $set: data },
      { new: true, upsert: true },
    )) as ISvipConfigDocument;
  }
}
