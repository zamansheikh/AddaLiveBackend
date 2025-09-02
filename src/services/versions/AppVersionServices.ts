import {
  IAppVersion,
  IAppVersionDocument,
} from "../../models/versions/appVersionModel";
import { IAppVersionRepository } from "../../repository/versions/AppVersionRepository";

export interface IAppVersionService {
  createVersion(data: IAppVersion): Promise<IAppVersionDocument>;
  updateVersion(data: Partial<IAppVersion>): Promise<IAppVersionDocument>;
  getVersion(): Promise<IAppVersion>;
}

export default class AppVersionService implements IAppVersionService {
  Repository: IAppVersionRepository;

  constructor(Repository: IAppVersionRepository) {
    this.Repository = Repository;
  }

  async createVersion(data: IAppVersion): Promise<IAppVersionDocument> {
    const newVersion = await this.Repository.createVersion(data);
    return newVersion;
  }

  async getVersion(): Promise<IAppVersion> {
    const version = await this.Repository.getAppVersion();
    return  {
      DownloadURL: version.DownloadURL,
      version: version.version,
      Release_note: version.Release_note,
    };;
  }

  async updateVersion(
    data: Partial<IAppVersion>
  ): Promise<IAppVersionDocument> {
    const updatedVersion = await this.Repository.updateVersion(data);
    return updatedVersion;
  }
}
