import RocketConfigModel, {
  IRocketConfig,
  IRocketConfigDocument,
  IRocketConfigModel,
} from "../../models/audio_room/rocketconfig";

export interface IRocketConfigRepository {
  /**
   * Fetches the unique rocket configuration document.
   */
  getConfig(): Promise<IRocketConfigDocument | null>;

  /**
   * Updates or creates the rocket configuration.
   * @param data The configuration data.
   */
  updateConfig(data: Partial<IRocketConfig>): Promise<IRocketConfigDocument>;
}

export class RocketConfigRepository implements IRocketConfigRepository {
  private Model: IRocketConfigModel;

  constructor(model: IRocketConfigModel) {
    this.Model = model;
  }

  async getConfig(): Promise<IRocketConfigDocument | null> {
    return await this.Model.findOne();
  }

  async updateConfig(data: Partial<IRocketConfig>): Promise<IRocketConfigDocument> {
    return (await this.Model.findOneAndUpdate(
      {}, // Match any (first document)
      { $set: data },
      { new: true, upsert: true }
    )) as IRocketConfigDocument;
  }
}
