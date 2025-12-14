import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import {
  IUpdateCost,
  IUpdateCostDocument,
  IUpdateCostModel,
} from "../../models/admin/update_cost_model";

export interface IUpdateCostRepository {
  getUpdateCostDoucment(): Promise<IUpdateCostDocument | null>;
  updateUpdateCost(
    id: string,
    updatedField: Partial<IUpdateCost>
  ): Promise<IUpdateCostDocument>;
  createUpdateCost(updateCost: IUpdateCost): Promise<IUpdateCostDocument>;
  deleteUpdateCost(id: string): Promise<IUpdateCostDocument>;
}

export class UpdateCostRepository implements IUpdateCostRepository {
  model: IUpdateCostModel;
  constructor(model: IUpdateCostModel) {
    this.model = model;
  }

  async getUpdateCostDoucment(): Promise<IUpdateCostDocument| null> {
    let updateCost = await this.model.findOne();
    return updateCost;
  }

  async updateUpdateCost(
    id: string,
    updatedField: Partial<IUpdateCost>
  ): Promise<IUpdateCostDocument> {
    const updateCost = await this.model.findByIdAndUpdate(id, updatedField, {
      new: true,
    });
    if (!updateCost) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        "Update cost document not found"
      );
    }
    return updateCost;
  }

  async createUpdateCost(
    updateCost: IUpdateCost
  ): Promise<IUpdateCostDocument> {
    return this.model.create(updateCost);
  }

  async deleteUpdateCost(id: string): Promise<IUpdateCostDocument> {
    const updateCost = await this.model.findByIdAndDelete(id);
    if (!updateCost) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        "Update cost document not found"
      );
    }
    return updateCost;
  }
}
