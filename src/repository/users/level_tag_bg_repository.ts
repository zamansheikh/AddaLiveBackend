import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import {
  ILevelTagBg,
  ILevelTagBgDocument,
  ILevelTagBgModel,
} from "../../models/user/level_tag_bg_model";

export interface ILevelTagBgRepository {
  create(levelTagBg: ILevelTagBg): Promise<ILevelTagBgDocument>;
  findAll(): Promise<ILevelTagBgDocument[]>;
  findByLevel(level: string): Promise<ILevelTagBgDocument | null>;
  findById(id: string): Promise<ILevelTagBgDocument | null>;
  update(
    id: string,
    levelTagBg: Partial<ILevelTagBg>
  ): Promise<ILevelTagBgDocument>;
}

export default class LevelTagBgRepository implements ILevelTagBgRepository {
  Model: ILevelTagBgModel;

  constructor(Model: ILevelTagBgModel) {
    this.Model = Model;
  }

  async create(levelTagBg: ILevelTagBg): Promise<ILevelTagBgDocument> {
    const newLevelTagBg = new this.Model(levelTagBg);
    return await newLevelTagBg.save();
  }

  async findAll(): Promise<ILevelTagBgDocument[]> {
    return await this.Model.find();
  }

  async findByLevel(level: string): Promise<ILevelTagBgDocument | null> {
    return await this.Model.findOne({ level });
  }

  async findById(id: string): Promise<ILevelTagBgDocument | null> {
    return await this.Model.findById(id);
}
  

  async update(
    id: string,
    levelTagBg: Partial<ILevelTagBg>
  ): Promise<ILevelTagBgDocument> {
    const updated = await this.Model.findByIdAndUpdate(id, levelTagBg, {
      new: true,
    });
    if (!updated)
      throw new AppError(StatusCodes.NOT_FOUND, "LevelTagBg not found");
    return updated;
  }
}
