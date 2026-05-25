import AppError from "../../core/errors/app_errors";
import AgoraConfigModel, {
  IAgoraConfig,
  IAgoraConfigDocument,
  IAgoraConfigModel,
} from "../../models/agora/agora_config_model";

export interface IAgoraConfigRepository {
  create(data: IAgoraConfig): Promise<IAgoraConfigDocument>;
  getAll(): Promise<IAgoraConfigDocument[]>;
  getById(id: string): Promise<IAgoraConfigDocument>;
  update(id: string, data: Partial<IAgoraConfig>): Promise<IAgoraConfigDocument>;
  delete(id: string): Promise<boolean>;
}

export default class AgoraConfigRepository implements IAgoraConfigRepository {
  private Model: IAgoraConfigModel;

  constructor(model: IAgoraConfigModel = AgoraConfigModel) {
    this.Model = model;
  }

  async create(data: IAgoraConfig): Promise<IAgoraConfigDocument> {
    return await this.Model.create(data);
  }

  async getAll(): Promise<IAgoraConfigDocument[]> {
    return await this.Model.find().sort({ createdAt: -1 });
  }

  async getById(id: string): Promise<IAgoraConfigDocument> {
    const document = await this.Model.findById(id);
    if (!document) {
      throw new AppError(404, "Agora configuration not found");
    }
    return document;
  }

  async update(id: string, data: Partial<IAgoraConfig>): Promise<IAgoraConfigDocument> {
    const updatedDocument = await this.Model.findByIdAndUpdate(id, data, {
      new: true,
      upsert: false,
    });
    if (!updatedDocument) {
      throw new AppError(404, "Agora configuration not found");
    }
    return updatedDocument;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.Model.findByIdAndDelete(id);
    return result != null;
  }
}
