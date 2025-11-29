import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IStoreCategoryDocument } from "../../models/store/store_category_model";
import { IStoreCategoryRepository } from "../../repository/store/store_category_repository";
import {
  IBundle,
  IStoreItem,
  IStoreItemDocument,
} from "../../models/store/store_item_model";
import { IPagination } from "../../core/Utils/query_builder";
import StoreItemRepository, {
  IStoreItemRepository,
} from "../../repository/store/store_item_repository";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../../core/Utils/upload_file_cloudinary";
import { profile } from "console";
import { IUserRepository } from "../../repository/users/user_repository";
import { IMyBucketRepository } from "../../repository/store/my_bucket_repository";
import IUserStatsRepository from "../../repository/users/userstats_repository_interface";
import mongoose, { mongo } from "mongoose";
import { IMyBucketDocument } from "../../models/store/my_bucket_model";

export interface IPremiumFiles {
  categoryName: string;
  svgaFile: Express.Multer.File;
}

export interface IStoreService {
  // 📌 store categories
  createCategory(title: string, isPremium?: boolean): Promise<IStoreCategoryDocument>;
  getCategoryById(id: string): Promise<IStoreCategoryDocument>;
  getAllCategories(): Promise<IStoreCategoryDocument[]>;
  updateCategory(id: string, title: string): Promise<IStoreCategoryDocument>;
  deleteCategory(id: string): Promise<IStoreCategoryDocument>;
  // 📌 store items
  createStoreItemSingle(
    item: IStoreItem,
    file: Express.Multer.File
  ): Promise<IStoreItemDocument>;
  createStoreItemBatch(
    item: IStoreItem,
    files: IPremiumFiles[]
  ): Promise<IStoreItemDocument>;
  getStoreItemById(id: string): Promise<IStoreItemDocument>;
  getAllStoreItems(
    category: string,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; items: IStoreItemDocument[] }>;
  updateStoreItemSingle(
    id: string,
    item: Partial<IStoreItem>,
    file?: Express.Multer.File
  ): Promise<IStoreItemDocument>;
  updateStoreItemBatch(
    id: string,
    item: Partial<IStoreItem>,
    files?: IPremiumFiles[]
  ): Promise<IStoreItemDocument>;
  deleteStoreItem(id: string): Promise<IStoreItemDocument>;
  changeItemCategory(
    itemId: string,
    newCategory: string
  ): Promise<IStoreItemDocument>;
  // 📌 my buckets
  buyStoreItem(ownerId: string, itemId: string): Promise<IStoreItemDocument>;
  getMyBucket(
    ownerId: string,
    category: string,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; buckets: IMyBucketDocument[] }>;
  userGiftItem(ownerId: string, bucketId: string): Promise<IMyBucketDocument>;
}

export default class StoreService implements IStoreService {
  CategoryRepository: IStoreCategoryRepository;
  ItemRepository: IStoreItemRepository;
  UserRepository: IUserRepository;
  userStatsRepository: IUserStatsRepository;
  BucketRepository: IMyBucketRepository;
  constructor(
    categoryRepository: IStoreCategoryRepository,
    itemRepository: IStoreItemRepository,
    userRepository: IUserRepository,
    userStatsRepository: IUserStatsRepository,
    bucketRepository: IMyBucketRepository
  ) {
    this.CategoryRepository = categoryRepository;
    this.ItemRepository = itemRepository;
    this.UserRepository = userRepository;
    this.userStatsRepository = userStatsRepository;
    this.BucketRepository = bucketRepository;
  }

  //  📌 store categories
  async createCategory(title: string, isPremium?: boolean): Promise<IStoreCategoryDocument> {
    if(isPremium) {
      const existingPremium = await this.CategoryRepository.getCategoryConditionally({isPremium: true});
      if(existingPremium) throw new AppError(StatusCodes.BAD_REQUEST, "Premium category already exists");
    }
    return await this.CategoryRepository.createCategory(title, isPremium);
  }

  async getCategoryById(id: string): Promise<IStoreCategoryDocument> {
    const category = await this.CategoryRepository.getCategoryById(id);
    if (!category) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Category with id ${id} not found`
      );
    }
    return category;
  }

  async getAllCategories(): Promise<IStoreCategoryDocument[]> {
    return await this.CategoryRepository.getAllCategories();
  }

  async updateCategory(
    id: string,
    title: string
  ): Promise<IStoreCategoryDocument> {
    const category = await this.CategoryRepository.getCategoryById(id);
    if (!category)
      throw new AppError(StatusCodes.NOT_FOUND, "Category not found");
    if (category.title === title) return category;
    await this.ItemRepository.updateBundleCategoryTitle(category.title, title);
    const updated = await this.CategoryRepository.updateCategory(id, title);
    return updated;
  }

  async deleteCategory(id: string): Promise<IStoreCategoryDocument> {
    const existingCategory = await this.CategoryRepository.getCategoryById(id);
    if (!existingCategory)
      throw new AppError(StatusCodes.NOT_FOUND, "Category not found");
    await this.ItemRepository.deleteByCategory(id);
    return await this.CategoryRepository.deleteCategory(id);
  }

  // 📌 store items
  async createStoreItemSingle(
    item: IStoreItem,
    file: Express.Multer.File
  ): Promise<IStoreItemDocument> {
    const url = await uploadFileToCloudinary({
      svga: true,
      folder: "store_items",
      file,
      isVideo: false,
    });
    let itemToCreate: IStoreItem = {
      name: item.name,
      validity: item.validity,
      categoryId: item.categoryId,
      isPremium: false,
      price: item.price,
      svgaFile: url,
    };
    return await this.ItemRepository.createStoreItem(itemToCreate);
  }

  async createStoreItemBatch(
    item: IStoreItem,
    files: IPremiumFiles[]
  ): Promise<IStoreItemDocument> {
    let premimumURLs = [];
    for (let i = 0; i < files.length; i++) {
      const url = await uploadFileToCloudinary({
        svga: true,
        folder: "store_items",
        file: files[i].svgaFile,
        isVideo: false,
      });
      premimumURLs.push({
        categoryName: files[i].categoryName,
        svgaFile: url,
      });
    }
    let itemToCreate: IStoreItem = {
      name: item.name,
      validity: item.validity,
      categoryId: item.categoryId,
      isPremium: true,
      price: item.price,
      bundleFiles: premimumURLs,
    };
    return await this.ItemRepository.createStoreItem(itemToCreate);
  }

  async getStoreItemById(id: string): Promise<IStoreItemDocument> {
    const item = await this.ItemRepository.getStoreItemById(id);
    if (!item)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Store item with id ${id} not found`
      );
    return item;
  }

  async getAllStoreItems(
    category: string,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; items: IStoreItemDocument[] }> {
    return await this.ItemRepository.getAllStoreItems(category, query);
  }

  async updateStoreItemSingle(
    id: string,
    item: Partial<IStoreItem>,
    file?: Express.Multer.File
  ): Promise<IStoreItemDocument> {
    const existingItem = await this.ItemRepository.getStoreItemById(id);
    if (!existingItem)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Store item with id ${id} not found`
      );
    if (existingItem.isPremium)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "This api is not for premium items"
      );

    if (file) {
      const url = await uploadFileToCloudinary({
        svga: true,
        folder: "store_items",
        file,
        isVideo: false,
      });
      item.svgaFile = url;
    }
    return await this.ItemRepository.updateStoreItem(id, item);
  }

  async updateStoreItemBatch(
    id: string,
    item: Partial<IStoreItem>,
    files?: IPremiumFiles[]
  ): Promise<IStoreItemDocument> {
    let existingItem = await this.ItemRepository.getStoreItemById(id);
    if (!existingItem)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Store item with id ${id} not found`
      );
    if (!existingItem.isPremium)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "This api is not for single items"
      );

    let urlsBeDeleted = [];

    for (let i = 0; i < existingItem.bundleFiles!.length; i++) {
      for (let j = 0; j < files!.length; j++) {
        if (
          existingItem.bundleFiles![i].categoryName.toString() ==
          files![j].categoryName
        ) {
          urlsBeDeleted.push(existingItem.bundleFiles![i].svgaFile);
          existingItem.bundleFiles = existingItem.bundleFiles?.filter(
            (f) => f.categoryName !== files![j].categoryName
          );
        }
      }
    }

    for (let i = 0; i < urlsBeDeleted.length; i++) {
      const parts = new URL(urlsBeDeleted[i]).pathname.split("/");
      const fileName = parts[parts.length - 1];
      const folderName = parts[parts.length - 2];
      const publicId = `${folderName}/${folderName}/${fileName}`;

      const deleteFile = await deleteFileFromCloudinary({
        isVideo: false,
        publicId: publicId,
        svga: true,
      });
      if (!deleteFile)
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to delete image from cloudinary"
        );
    }

    let newFilesToBeAdded: IBundle[] = [];

    for (let i = 0; i < files!.length; i++) {
      let url = await uploadFileToCloudinary({
        svga: true,
        folder: "store_items",
        file: files![i].svgaFile,
        isVideo: false,
      });
      newFilesToBeAdded.push({
        categoryName: files![i].categoryName,
        svgaFile: url,
      });
    }

    let profileToBeUpdated: IStoreItem = {
      name: item.name || existingItem.name,
      validity: item.validity || existingItem.validity,
      categoryId: item.categoryId || existingItem.categoryId,
      isPremium: true,
      price: item.price || existingItem.price,
      bundleFiles: [...existingItem.bundleFiles!, ...newFilesToBeAdded],
    };

    const updated = await this.ItemRepository.updateStoreItem(
      id,
      profileToBeUpdated
    );
    return updated;
  }

  async deleteStoreItem(id: string): Promise<IStoreItemDocument> {
    throw new AppError(StatusCodes.NOT_IMPLEMENTED, "Method not implemented.");
  }

  async changeItemCategory(
    itemId: string,
    newCategory: string
  ): Promise<IStoreItemDocument> {
    return await this.ItemRepository.updateStoreItem(itemId, {
      categoryId: newCategory,
    });
  }

  // 📌 my buckets
  async buyStoreItem(
    ownerId: string,
    itemId: string
  ): Promise<IStoreItemDocument> {
    const user = await this.UserRepository.findUserById(ownerId);
    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    const stats = await this.userStatsRepository.getUserStats(ownerId);
    if (!stats)
      throw new AppError(StatusCodes.NOT_FOUND, "User stats not found");
    const item = await this.ItemRepository.getStoreItemById(itemId);
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Item not found");
    if (item.price > stats.coins!)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `for item price ${item.price} having  ${stats.coins} coins is not enough`
      );

    // starting transaction

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await this.userStatsRepository.updateCoins(ownerId, -item.price, session);
      await this.ItemRepository.updateSoldCount(itemId);
      await this.BucketRepository.createNewBucket(
        {
          itemId: item._id as string,
          ownerId: ownerId,
          categoryId: item.categoryId,
          expireAt: new Date(Date.now() + item.validity * 15 * 24 * 60 * 60 * 1000), // validity in days
        },
        session
      );
      await session.commitTransaction();
      return item;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getMyBucket(
    ownerId: string,
    category: string,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; buckets: IMyBucketDocument[] }> {
    const owener = await this.UserRepository.findUserById(ownerId);
    if (!owener) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    const existingCategory = await this.CategoryRepository.getCategoryById(
      category
    );
    if (!existingCategory)
      throw new AppError(StatusCodes.NOT_FOUND, "Category not found");
    return await this.BucketRepository.getAllBuckets(ownerId, category, query);
  }

  async userGiftItem(
    ownerId: string,
    bucketId: string
  ): Promise<IMyBucketDocument> {
    const owner = await this.UserRepository.findUserById(ownerId);
    const bucket = await this.BucketRepository.getBucketsById(bucketId);
    if (!owner) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    if (!bucket) throw new AppError(StatusCodes.NOT_FOUND, "Bucket not found");
    if (bucket.ownerId.toString() != ownerId)
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        "You are not the owner of this bucket"
      );
    if (bucket.useStatus) {
      const updated = await this.BucketRepository.updateBucket(bucketId, {
        useStatus: false,
      });
      return updated;
    }
    const item = await this.ItemRepository.getStoreItemById(
      bucket.itemId.toString()
    );
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Item not found");
    const premiumCategory = await this.CategoryRepository.getCategoryConditionally({isPremium: true});

    // start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (item.isPremium) {
        // deselecting all the items
        await this.BucketRepository.updateBucketUseStatus(
          { ownerId: ownerId, useStatus: true },
          { useStatus: false },
          session
        );
      } else {
        // deselect premium items
        if(premiumCategory)
          await this.BucketRepository.updateBucketUseStatus(
            { ownerId: ownerId, useStatus: true, categoryId: premiumCategory!._id },
            { useStatus: false },
            session
          );
        // deselecting all the items in a single category
        await this.BucketRepository.updateBucketUseStatus(
          { ownerId: ownerId, useStatus: true, categoryId: bucket.categoryId },
          { useStatus: false },
          session
        );
      }
      const updated = await this.BucketRepository.updateBucket(bucketId, {
        useStatus: true,
      });
      await session.commitTransaction();
      return updated;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
