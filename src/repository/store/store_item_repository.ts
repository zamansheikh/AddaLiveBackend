import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IPagination, QueryBuilder } from "../../core/Utils/query_builder";
import {
  IBundle,
  IStoreItem,
  IStoreItemDocument,
  IStoreItemModel,
} from "../../models/store/store_item_model";
import { DatabaseNames } from "../../core/Utils/enums";
import { ClientSession, DeleteResult, Types, UpdateResult } from "mongoose";
import { promises } from "dns";

export interface IStoreItemRepository {
  createStoreItem(item: IStoreItem): Promise<IStoreItemDocument>;
  getStoreItemById(id: string): Promise<IStoreItemDocument | null>;
  getStoreItemByName(name: string): Promise<IStoreItemDocument | null>;
  /** All live SVIP tier items (name matches "SVIP-<number>"), sorted by tier. */
  getSvipTierItems(): Promise<IStoreItemDocument[]>;
  getAllStoreItems(
    category: string,
    query: Record<string, any>,
    id: string,
  ): Promise<{ pagination: IPagination; items: IStoreItemDocument[] }>;
  getAllStoreItemsByCategoryGrouped(
    id: string,
  ): Promise<Record<string, IStoreItemDocument[]>>;
  updateStoreItem(
    id: string,
    item: Partial<IStoreItem>,
  ): Promise<IStoreItemDocument>;
  deleteStoreItem(id: string, days: number): Promise<IStoreItemDocument>;
  deleteStoreItemHard(id: string): Promise<IStoreItemDocument>;
  updateBundleCategoryTitle(
    oldTitle: string,
    newTitle: string,
  ): Promise<UpdateResult>;
  createNewBundles(id: string, bundle: IBundle[]): Promise<IStoreItemDocument>;
  deleteByCategory(categoryId: string): Promise<DeleteResult>;
  deleteByBundleCategoryName(categoryName: string): Promise<DeleteResult>;
  updateSoldCount(itemId: string, session?: ClientSession): Promise<void>;
  getAllStoreItemByCategory(
    categoryId: string,
    id?: string,
  ): Promise<IStoreItemDocument[]>; // no pagination
  getStoreItemsByBundleCategoryName(
    categoryName: string,
  ): Promise<IStoreItemDocument[]>;
  getExclusiveStoreItems(): Promise<IStoreItemDocument[]>;
  getExclusiveStoreItemsGrouped(): Promise<Record<string, IStoreItemDocument[]>>;
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

  async getStoreItemByName(name: string): Promise<IStoreItemDocument | null> {
    return await this.Model.findOne({ name });
  }

  async getSvipTierItems(): Promise<IStoreItemDocument[]> {
    return await this.Model.find({
      name: { $regex: /^SVIP-\d+$/ },
      deleteStatus: false,
    });
  }

  async getAllStoreItems(
    category: string,
    query: Record<string, any>,
    id: string,
  ): Promise<{ pagination: IPagination; items: IStoreItemDocument[] }> {
    const qb = new QueryBuilder(this.Model, query);
    // Note: Since we need aggregation for isBought, we use aggregation directly
    // but we can still use some qb logic if needed or just implement pagination here.
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      {
        $match: {
          categoryId: new Types.ObjectId(category),
          deleteStatus: false,
          canUserBuyThis: true,
        },
      },
      {
        $lookup: {
          from: DatabaseNames.MyBucketItem,
          let: { itemId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$itemId", "$$itemId"] },
                    { $eq: ["$ownerId", new Types.ObjectId(id)] },
                  ],
                },
              },
            },
          ],
          as: "boughtInfo",
        },
      },
      {
        $addFields: {
          isBought: { $gt: [{ $size: "$boughtInfo" }, 0] },
        },
      },
      {
        $project: {
          boughtInfo: 0,
        },
      },
      { $skip: skip },
      { $limit: limit },
    ];

    const items = await this.Model.aggregate(pipeline);
    const total = await this.Model.countDocuments({
      categoryId: category,
      deleteStatus: false,
      canUserBuyThis: true,
    });

    const pagination: IPagination = {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    };

    return { pagination, items };
  }

  async getAllStoreItemsByCategoryGrouped(
    id: string,
  ): Promise<Record<string, IStoreItemDocument[]>> {
    const results = await this.Model.db
      .collection(DatabaseNames.StoreCategory)
      .aggregate([
        {
          $match: {
            isPremium: false,
          },
        },
        {
          $lookup: {
            from: DatabaseNames.StoreItem,
            localField: "_id",
            foreignField: "categoryId",
            pipeline: [
              {
                $match: {
                  deleteStatus: false,
                  canUserBuyThis: true,
                },
              },
              {
                $lookup: {
                  from: DatabaseNames.MyBucketItem,
                  let: { itemId: "$_id" },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $eq: ["$itemId", "$$itemId"] },
                            {
                              $eq: ["$ownerId", new Types.ObjectId(id)],
                            },
                          ],
                        },
                      },
                    },
                  ],
                  as: "boughtInfo",
                },
              },
              {
                $addFields: {
                  isBought: { $gt: [{ $size: "$boughtInfo" }, 0] },
                },
              },
              {
                $project: {
                  boughtInfo: 0,
                },
              },
            ],
            as: "items",
          },
        },

        {
          $group: {
            _id: null,
            categories: {
              $push: {
                k: "$title",
                v: "$items",
              },
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $arrayToObject: "$categories",
            },
          },
        },
      ])
      .toArray();

    return results[0] || {};
  }

  async deleteStoreItem(id: string, days: number): Promise<IStoreItemDocument> {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    const deleted = await this.Model.findByIdAndUpdate(
      id,
      { expireAt: newDate, deleteStatus: true },
      { new: true },
    );
    if (!deleted)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Store item with id ${id} not found`,
      );
    return deleted;
  }
  async deleteStoreItemHard(id: string): Promise<IStoreItemDocument> {
    const deleted = await this.Model.findByIdAndDelete(id);
    if (!deleted)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Store item with id ${id} not found`,
      );
    return deleted;
  }

  async updateStoreItem(
    id: string,
    item: Partial<IStoreItem>,
  ): Promise<IStoreItemDocument> {
    const updated = await this.Model.findByIdAndUpdate(id, item, { new: true });
    if (!updated)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Store item with id ${id} not found`,
      );
    return updated;
  }

  async updateBundleCategoryTitle(
    oldTitle: string,
    newTitle: string,
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
      },
    );
  }

  async createNewBundles(
    id: string,
    bundle: IBundle[],
  ): Promise<IStoreItemDocument> {
    const updated = await this.Model.findByIdAndUpdate(
      id,
      { $push: { bundleFiles: { $each: bundle } } },
      { new: true },
    );
    if (!updated)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Store item with id ${id} not found`,
      );
    return updated;
  }

  async deleteByCategory(categoryId: string): Promise<DeleteResult> {
    return await this.Model.deleteMany({ categoryId });
  }

  async deleteByBundleCategoryName(
    categoryName: string,
  ): Promise<DeleteResult> {
    return await this.Model.deleteMany({
      "bundleFiles.categoryName": categoryName,
    });
  }

  async updateSoldCount(
    itemId: string,
    session?: ClientSession,
  ): Promise<void> {
    await this.Model.findByIdAndUpdate(itemId, {
      $inc: { totalSold: 1 },
    }).session(session || null);
  }

  async getAllStoreItemByCategory(
    categoryId: string,
    id?: string,
  ): Promise<IStoreItemDocument[]> {
    const pipeline: any[] = [
      {
        $match: {
          categoryId: new Types.ObjectId(categoryId),
          deleteStatus: false,
          canUserBuyThis: true,
        },
      },
    ];

    if (id) {
      pipeline.push(
        {
          $lookup: {
            from: DatabaseNames.MyBucketItem,
            let: { itemId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$itemId", "$$itemId"] },
                      { $eq: ["$ownerId", new Types.ObjectId(id)] },
                    ],
                  },
                },
              },
            ],
            as: "boughtInfo",
          },
        },
        {
          $addFields: {
            isBought: { $gt: [{ $size: "$boughtInfo" }, 0] },
          },
        },
        {
          $project: {
            boughtInfo: 0,
          },
        },
      );
    }

    return await this.Model.aggregate(pipeline);
  }

  async getStoreItemsByBundleCategoryName(
    categoryName: string,
  ): Promise<IStoreItemDocument[]> {
    return await this.Model.find({
      "bundleFiles.categoryName": categoryName,
    });
  }

  async getExclusiveStoreItems(): Promise<IStoreItemDocument[]> {
    return await this.Model.find({
      canUserBuyThis: false,
      deleteStatus: false,
    });
  }

  async getExclusiveStoreItemsGrouped(): Promise<
    Record<string, IStoreItemDocument[]>
  > {
    const results = await this.Model.db
      .collection(DatabaseNames.StoreCategory)
      .aggregate([
        {
          $lookup: {
            from: DatabaseNames.StoreItem,
            localField: "_id",
            foreignField: "categoryId",
            pipeline: [
              {
                $match: {
                  deleteStatus: false,
                  canUserBuyThis: false,
                },
              },
            ],
            as: "items",
          },
        },
        {
          $group: {
            _id: null,
            categories: {
              $push: {
                k: "$title",
                v: "$items",
              },
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $arrayToObject: "$categories",
            },
          },
        },
      ])
      .toArray();

    return results[0] || {};
  }
}
