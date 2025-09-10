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
    const existingVersion = await this.Model.find({});
    if(existingVersion && existingVersion.length > 0) throw new AppError(StatusCodes.BAD_REQUEST, "Version already exists");
    const newVersion = new this.Model(data);
    return await newVersion.save();
  }

  async getAppVersion(): Promise<IAppVersionDocument> {
    let data = await this.Model.find({}) as IAppVersionDocument[];
    if (!data) throw new AppError(StatusCodes.NOT_FOUND, "No version found");
    return data[0];
  }

  async updateVersion(
    data: Partial<IAppVersion>
  ): Promise<IAppVersionDocument> {
    const d = await this.Model.find({}) as IAppVersionDocument[];
    if(d && d.length == 0) throw new AppError(StatusCodes.NOT_FOUND, "No version found");
    const id = d[0]._id;
    const version = await this.Model.findByIdAndUpdate(id, data, {
      new: true,
    });
    if (!version) throw new AppError(StatusCodes.NOT_FOUND, "No version found");
    return version;
  }
}
