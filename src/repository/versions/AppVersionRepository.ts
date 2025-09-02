import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import {
  IAppVersion,
  IAppVersionDocument,
  IAppVersionModel,
} from "../../models/versions/appVersionModel";

export interface IAppVersionRepository {
  createVersion(data: IAppVersion): Promise<IAppVersionDocument>;
  updateVersion(data: Partial<IAppVersion>): Promise<IAppVersionDocument>;
  getAppVersion(): Promise<IAppVersionDocument>;
}

export default class AppVersionRepository implements IAppVersionRepository {
  Model: IAppVersionModel;
  constructor(model: IAppVersionModel) {
    this.Model = model;
  }

  async createVersion(data: IAppVersion): Promise<IAppVersionDocument> {
    const newVersion = new this.Model(data);
    return await newVersion.save();
  }

  async getAppVersion(): Promise<IAppVersionDocument> {
    const id = "68b6ffc212404d56f6f000ae";
    const data = await this.Model.findById(id);
    if (!data) throw new AppError(StatusCodes.NOT_FOUND, "No version found");
    return data;
  }

  async updateVersion(
    data: Partial<IAppVersion>
  ): Promise<IAppVersionDocument> {
    const id = "68b6ffc212404d56f6f000ae";
    const version = await this.Model.findByIdAndUpdate(id, data, {
      new: true,
    });
    if (!version) throw new AppError(StatusCodes.NOT_FOUND, "No version found");
    return version;
  }
}
