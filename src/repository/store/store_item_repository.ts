import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IPagination, QueryBuilder } from "../../core/Utils/query_builder";
import {
  IBundle,
  IStoreItem,
  IStoreItemDocument,
  IStoreItemModel,
} from "../../models/store/store_item_model";
import { DeleteResult, UpdateResult } from "mongoose";
import { promises } from "dns";

export interface IStoreItemRepository {
  createStoreItem(item: IStoreItem): Promise<IStoreItemDocument>;
  getStoreItemById(id: string): Promise<IStoreItemDocument | null>;
  getAllStoreItems(
    category: string,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; items: IStoreItemDocument[] }>;
  updateStoreItem(
    id: string,
    item: Partial<IStoreItem>
  ): Promise<IStoreItemDocument>;
  deleteStoreItem(id: string, days: number): Promise<IStoreItemDocument>;
  updateBundleCategoryTitle(
    oldTitle: string,
    newTitle: string
  ): Promise<UpdateResult>;
  createNewBundles(id: string, bundle: IBundle[]): Promise<IStoreItemDocument>;
  deleteByCategory(categoryId: string): Promise<DeleteResult>;
  updateSoldCount(itemId: string): Promise<void>;
}

export default class StoreItemRepository implements IStoreItemRepository {
  Model: IStoreItemModel;
  constructor(model: IStoreItemModel) {
    this.Model = model;
  }

  async createStoreItem(item: IStoreItem): Promise<IStoreItemDocument> {
    const storeItem = new this.Model(item);
    return await storeItem.save();
  }

  async getStoreItemById(id: string): Promise<IStoreItemDocument | null> {
    return await this.Model.findById(id);
  }

  async getAllStoreItems(
    category: string,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; items: IStoreItemDocument[] }> {
    const qb = new QueryBuilder(this.Model, query);
    const res = qb
      .find({ categoryId: category, deleteStatus: false })
      .sort()
      .paginate();
    const items = await res.exec();
    const pagination = await res.countTotal();
    return { pagination, items };
  }

  async deleteStoreItem(id: string, days: number): Promise<IStoreItemDocument> {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    const deleted = await this.Model.findByIdAndUpdate(
      id,
      { expireAt: newDate, deleteStatus: true },
      { new: true }
    );
    if (!deleted)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Store item with id ${id} not found`
      );
    return deleted;
  }

  async updateStoreItem(
    id: string,
    item: Partial<IStoreItem>
  ): Promise<IStoreItemDocument> {
    const updated = await this.Model.findByIdAndUpdate(id, item, { new: true });
    if (!updated)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Store item with id ${id} not found`
      );
    return updated;
  }

  async updateBundleCategoryTitle(
    oldTitle: string,
    newTitle: string
  ): Promise<UpdateResult> {
    return await this.Model.updateMany(
      {
        "bundleFiles.categoryName": oldTitle,
      },
      {
        $set: {
          "bundleFiles.$[elem].categoryName": newTitle,
        },
      },
      {
        arrayFilters: [
          {
            "elem.categoryName": oldTitle,
          },
        ],
      }
    );
  }

  async createNewBundles(
    id: string,
    bundle: IBundle[]
  ): Promise<IStoreItemDocument> {
    const updated = await this.Model.findByIdAndUpdate(
      id,
      { $push: { bundleFiles: { $each: bundle } } },
      { new: true }
    );
    if (!updated)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Store item with id ${id} not found`
      );
    return updated;
  }

  async deleteByCategory(categoryId: string): Promise<DeleteResult> {
    return await this.Model.deleteMany({ categoryId });
  }

  async updateSoldCount(itemId: string): Promise<void> {
    await this.Model.findByIdAndUpdate(itemId, { $inc: { totalSold: 1 } });
  }
}
