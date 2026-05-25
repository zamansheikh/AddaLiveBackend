import AppError from "../../core/errors/app_errors";
import {
  IAgoraConfig,
  IAgoraConfigDocument,
} from "../../models/agora/agora_config_model";
import AgoraConfigRepository, {
  IAgoraConfigRepository,
} from "../../repository/agora/agora_config_repository";

export interface IAgoraConfigService {
  create(data: IAgoraConfig): Promise<IAgoraConfigDocument>;
  getAll(): Promise<IAgoraConfigDocument[]>;
  getById(id: string): Promise<IAgoraConfigDocument>;
  update(id: string, data: Partial<IAgoraConfig>): Promise<IAgoraConfigDocument>;
  delete(id: string): Promise<boolean>;
}

export class AgoraConfigService implements IAgoraConfigService {
  private repository: IAgoraConfigRepository;

  constructor(repository: IAgoraConfigRepository = new AgoraConfigRepository()) {
    this.repository = repository;
  }

  async create(data: IAgoraConfig): Promise<IAgoraConfigDocument> {
    if (!data.appId || data.appId.trim().length === 0) {
      throw new AppError(400, "appId is required");
    }
    if (!data.appCertificate || data.appCertificate.trim().length === 0) {
      throw new AppError(400, "appCertificate is required");
    }
    if (!data.defaultChannel || data.defaultChannel.trim().length === 0) {
      throw new AppError(400, "defaultChannel is required");
    }
    if (!data.defaultUid || data.defaultUid < 0) {
      throw new AppError(400, "defaultUid must be a non-negative number");
    }
    if (!data.defaultRole || data.defaultRole.trim().length === 0) {
      throw new AppError(400, "defaultRole is required");
    }
    if (!data.tokenExpiry || data.tokenExpiry <= 0) {
      throw new AppError(400, "tokenExpiry must be a positive number");
    }

    return await this.repository.create(data);
  }

  async getAll(): Promise<IAgoraConfigDocument[]> {
    return await this.repository.getAll();
  }

  async getById(id: string): Promise<IAgoraConfigDocument> {
    return await this.repository.getById(id);
  }

  async update(id: string, data: Partial<IAgoraConfig>): Promise<IAgoraConfigDocument> {
    await this.repository.getById(id); // existence check

    if (data.appId !== undefined && data.appId.trim().length === 0) {
      throw new AppError(400, "appId cannot be empty");
    }
    if (data.appCertificate !== undefined && data.appCertificate.trim().length === 0) {
      throw new AppError(400, "appCertificate cannot be empty");
    }
    if (data.defaultChannel !== undefined && data.defaultChannel.trim().length === 0) {
      throw new AppError(400, "defaultChannel cannot be empty");
    }
    if (data.defaultUid !== undefined && data.defaultUid < 0) {
      throw new AppError(400, "defaultUid must be a non-negative number");
    }
    if (data.defaultRole !== undefined && data.defaultRole.trim().length === 0) {
      throw new AppError(400, "defaultRole cannot be empty");
    }
    if (data.tokenExpiry !== undefined && data.tokenExpiry <= 0) {
      throw new AppError(400, "tokenExpiry must be a positive number");
    }

    return await this.repository.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    await this.repository.getById(id); // existence check
    return await this.repository.delete(id);
  }
}
