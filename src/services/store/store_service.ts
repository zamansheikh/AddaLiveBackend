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
  /** Optional — admin can upload an SVIP/VIP frame as a static image only. */
  svgaFile?: Express.Multer.File;
  /** Optional — admin can upload only an animated svga without a thumbnail. */
  previewFile?: Express.Multer.File;
}

export interface IStoreService {
  // 📌 store categories
  createCategory(title: string): Promise<IStoreCategoryDocument>;
  getCategoryById(id: string): Promise<IStoreCategoryDocument>;
  getAllCategories(): Promise<IStoreCategoryDocument[]>;
  updateCategory(id: string, title: string): Promise<IStoreCategoryDocument>;
  deleteCategory(id: string): Promise<IStoreCategoryDocument>;
  categoryDeleteEffectedItems(id: string): Promise<{
    categoryItemCount: number;
    categoryItemNames: string[];
    premiumItemCount: number;
    premiumItems: string[];
  }>;
  // 📌 store items
  createStoreItemSingle(
    item: IStoreItem,
    svgaFile?: Express.Multer.File,
    previewFile?: Express.Multer.File,
    logoFile?: Express.Multer.File,
  ): Promise<IStoreItemDocument>;
  createStoreItemBatch(
    item: IStoreItem,
    files: IPremiumFiles[],
    logoFile?: Express.Multer.File,
  ): Promise<IStoreItemDocument>;
  getStoreItemById(id: string): Promise<IStoreItemDocument>;
  getVIPStoreItems(id: string): Promise<IStoreItemDocument[]>;
  getSVIPStoreItems(id: string): Promise<IStoreItemDocument[]>;
  getAllStoreItems(id: string): Promise<Record<string, IStoreItemDocument[]>>;
  getExlusiveStoreItems(): Promise<Record<string, IStoreItemDocument[]>>;
  getStoreItemsByCategory(
    category: string,
    query: Record<string, any>,
    id: string,
  ): Promise<{ pagination: IPagination; items: IStoreItemDocument[] }>;
  updateStoreItemSingle(
    id: string,
    item: Partial<IStoreItem>,
    svgaFile?: Express.Multer.File,
    previewFile?: Express.Multer.File,
    logoFile?: Express.Multer.File,
  ): Promise<IStoreItemDocument>;
  updateStoreItemBatch(
    id: string,
    item: Partial<IStoreItem>,
    files?: IPremiumFiles[],
    logoFile?: Express.Multer.File,
  ): Promise<IStoreItemDocument>;
  deleteStoreItem(id: string): Promise<IStoreItemDocument>;
  changeItemCategory(
    itemId: string,
    newCategory: string,
  ): Promise<IStoreItemDocument>;
  getEffectedBucketSummary(itemId: string): Promise<{
    itemName: string;
    userCount: number;
  }>;
  // 📌 my buckets
  buyStoreItem(
    ownerId: string,
    itemId: string,
    priceIndex?: number,
  ): Promise<IStoreItemDocument>;
  getMyBucketByCategory(
    ownerId: string,
    category: string,
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; buckets: IMyBucketDocument[] }>;
  getMyBuckets(
    ownerId: string,
    query: Record<string, any>,
  ): Promise<Record<string, IMyBucketDocument[]>>;
  selectBucket(ownerId: string, bucketId: string): Promise<IMyBucketDocument>;
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
    bucketRepository: IMyBucketRepository,
  ) {
    this.CategoryRepository = categoryRepository;
    this.ItemRepository = itemRepository;
    this.UserRepository = userRepository;
    this.userStatsRepository = userStatsRepository;
    this.BucketRepository = bucketRepository;
  }

  //  📌 store categories
  async createCategory(title: string): Promise<IStoreCategoryDocument> {
    const calculatedPremium = title === "VIP" || title === "SVIP";
    return await this.CategoryRepository.createCategory(
      title,
      calculatedPremium,
    );
  }

  async getCategoryById(id: string): Promise<IStoreCategoryDocument> {
    const category = await this.CategoryRepository.getCategoryById(id);
    if (!category) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Category with id ${id} not found`,
      );
    }
    return category;
  }

  async getAllCategories(): Promise<IStoreCategoryDocument[]> {
    return await this.CategoryRepository.getAllCategories();
  }

  async updateCategory(
    id: string,
    title: string,
  ): Promise<IStoreCategoryDocument> {
    const category = await this.CategoryRepository.getCategoryById(id);
    if (!category)
      throw new AppError(StatusCodes.NOT_FOUND, "Category not found");
    if (category.title === title) return category;
    await this.ItemRepository.updateBundleCategoryTitle(category.title, title);
    const updated = await this.CategoryRepository.updateCategory(id, title);
    return updated;
  }

  async categoryDeleteEffectedItems(id: string): Promise<{
    categoryItemCount: number;
    categoryItemNames: string[];
    premiumItemCount: number;
    premiumItems: string[];
  }> {
    const category = await this.CategoryRepository.getCategoryById(id);
    if (!category)
      throw new AppError(StatusCodes.NOT_FOUND, "Category not found");
    const normalItems = await this.ItemRepository.getAllStoreItemByCategory(id);
    const premiumItems =
      await this.ItemRepository.getStoreItemsByBundleCategoryName(
        category.title,
      );
    return {
      categoryItemCount: normalItems.length,
      categoryItemNames: normalItems.map((item) => item.name),
      premiumItemCount: premiumItems.length,
      premiumItems: premiumItems.map((item) => item.name),
    };
  }

  async deleteCategory(id: string): Promise<IStoreCategoryDocument> {
    const existingCategory = await this.CategoryRepository.getCategoryById(id);
    if (!existingCategory)
      throw new AppError(StatusCodes.NOT_FOUND, "Category not found");

    // 1. Get all items directly in this category
    const normalItems = await this.ItemRepository.getAllStoreItemByCategory(id);

    // 2. Get all premium items that include this category in their bundle
    const premiumItems =
      await this.ItemRepository.getStoreItemsByBundleCategoryName(
        existingCategory.title,
      );

    // 3. Combine and get unique item IDs to avoid double deletion
    const itemIdsToDelete = new Set([
      ...normalItems.map((item) => (item as any)._id.toString()),
      ...premiumItems.map((item) => (item as any)._id.toString()),
    ]);

    // 4. Delete each item using the full cleanup logic
    // We use a loop to ensure Cloudinary and Bucket cleanup for every single item
    for (const itemId of itemIdsToDelete) {
      try {
        await this.deleteStoreItem(itemId);
      } catch (error) {
        console.error(
          `[StoreService] Failed to perform full deletion for item ${itemId} during category deletion:`,
          error,
        );
        // We continue to ensure as many items as possible are cleaned up
      }
    }

    // 5. Finally delete the category document
    return await this.CategoryRepository.deleteCategory(id);
  }

  // 📌 store items
  async createStoreItemSingle(
    item: IStoreItem,
    svgaFile?: Express.Multer.File,
    previewFile?: Express.Multer.File,
    logoFile?: Express.Multer.File,
  ): Promise<IStoreItemDocument> {
    const existingName = await this.ItemRepository.getStoreItemByName(
      item.name,
    );
    if (existingName) {
      throw new AppError(
        StatusCodes.CONFLICT,
        `Item with name ${item.name} already exists`,
      );
    }

    const category = await this.CategoryRepository.getCategoryById(
      item.categoryId.toString(),
    );
    if (!category)
      throw new AppError(StatusCodes.NOT_FOUND, "Category not found");
    if (category.isPremium)
      throw new AppError(StatusCodes.BAD_REQUEST, "This is a premium category");
    let svgaUrl: string | undefined;
    if (svgaFile) {
      svgaUrl = await uploadFileToCloudinary({
        folder: "store_items",
        file: svgaFile,
      });
    }

    let previewUrl: string | undefined;
    if (previewFile) {
      previewUrl = await uploadFileToCloudinary({
        folder: "store_items",
        file: previewFile,
      });
    }
    let logoUrl: string | undefined;
    if (logoFile) {
      logoUrl = await uploadFileToCloudinary({
        folder: "store_items",
        file: logoFile,
      });
    }

    let itemToCreate: IStoreItem = {
      name: item.name,
      logo: logoUrl || item.logo,
      categoryId: item.categoryId,
      isPremium: false,
      prices: item.prices,
      svgaFile: svgaUrl,
      previewFile: previewUrl,
      privilege: item.privilege,
      canUserBuyThis: item.canUserBuyThis ?? true,
    };
    return await this.ItemRepository.createStoreItem(itemToCreate);
  }

  async createStoreItemBatch(
    item: IStoreItem,
    files: IPremiumFiles[],
    logoFile?: Express.Multer.File,
  ): Promise<IStoreItemDocument> {
    const existingName = await this.ItemRepository.getStoreItemByName(
      item.name,
    );
    if (existingName) {
      throw new AppError(
        StatusCodes.CONFLICT,
        `Item with name ${item.name} already exists`,
      );
    }

    // chhecking category validity
    const exisitngCategory = await this.CategoryRepository.getCategoryById(
      item.categoryId.toString(),
    );

    if (!exisitngCategory)
      throw new AppError(StatusCodes.NOT_FOUND, "Category not found");
    if (!exisitngCategory.isPremium)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "This is not a premium category",
      );

    // checking category name validity. Either svgaFile or previewFile (or
    // both) is present — controller already enforced that.
    for (let i = 0; i < files.length; i++) {
      const reference = files[i].svgaFile ?? files[i].previewFile;
      if (!reference)
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `category -> ${files[i].categoryName} has no file`,
        );
      const extension = reference.originalname.split(".").pop();
      const categoryName = files[i].categoryName;
      const isValidCategory =
        await this.CategoryRepository.isValidCategory(categoryName);
      if (!extension)
        throw new AppError(StatusCodes.BAD_REQUEST, "Invalid file format");
      if (!isValidCategory)
        throw new AppError(
          StatusCodes.NOT_FOUND,
          `category -> ${categoryName} is not valid name`,
        );
    }
    // Upload all bundle files in parallel. Sequential awaits made the total
    // wall-clock time = sum of every file's upload latency, which routinely
    // tripped the upstream proxy/CDN timeout for large batches. Parallel
    // uploads cap total time at the slowest single file.
    const premimumURLs: IBundle[] = await Promise.all(
      files.map(async (entry) => {
        const svgaSource = entry.svgaFile;
        const previewSource = entry.previewFile;
        const extensionSource = svgaSource ?? previewSource!;
        const extension = extensionSource.originalname.split(".").pop() ?? "";

        const [svgaUrl, previewUrl] = await Promise.all([
          svgaSource
            ? uploadFileToCloudinary({
                folder: "store_items",
                file: svgaSource,
              })
            : Promise.resolve(""),
          previewSource
            ? uploadFileToCloudinary({
                folder: "store_items",
                file: previewSource,
              })
            : Promise.resolve(""),
        ]);

        return {
          categoryName: entry.categoryName,
          svgaFile: svgaUrl,
          previewFile: previewUrl,
          fileType: extension,
        };
      }),
    );

    let logoUrl: string | undefined;
    if (logoFile) {
      logoUrl = await uploadFileToCloudinary({
        folder: "store_items",
        file: logoFile,
      });
    }

    let itemToCreate: IStoreItem = {
      name: item.name,
      logo: logoUrl || item.logo,
      categoryId: item.categoryId,
      isPremium: true,
      prices: item.prices,
      bundleFiles: premimumURLs,
      privilege: item.privilege,
    };
    return await this.ItemRepository.createStoreItem(itemToCreate);
  }

  async getStoreItemById(id: string): Promise<IStoreItemDocument> {
    const item = await this.ItemRepository.getStoreItemById(id);
    if (!item)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Store item with id ${id} not found`,
      );
    return item;
  }

  async getAllStoreItems(
    id: string,
  ): Promise<Record<string, IStoreItemDocument[]>> {
    return await this.ItemRepository.getAllStoreItemsByCategoryGrouped(id);
  }

  async getExlusiveStoreItems(): Promise<Record<string, IStoreItemDocument[]>> {
    return await this.ItemRepository.getExclusiveStoreItemsGrouped();
  }

  async getVIPStoreItems(id: string): Promise<IStoreItemDocument[]> {
    const category = await this.CategoryRepository.getCategoryByTitle("VIP");
    if (!category) return [];
    const items = await this.ItemRepository.getAllStoreItemByCategory(
      (category as any)._id.toString(),
      id,
    );
    return this.applyPremiumTierIsBought(items);
  }

  async getSVIPStoreItems(id: string): Promise<IStoreItemDocument[]> {
    const category = await this.CategoryRepository.getCategoryByTitle("SVIP");
    if (!category) return [];
    const items = await this.ItemRepository.getAllStoreItemByCategory(
      (category as any)._id.toString(),
      id,
    );
    return this.applyPremiumTierIsBought(items);
  }

  async getStoreItemsByCategory(
    category: string,
    query: Record<string, any>,
    id: string,
  ): Promise<{ pagination: IPagination; items: IStoreItemDocument[] }> {
    const result = await this.ItemRepository.getAllStoreItems(
      category,
      query,
      id,
    );

    // Check if this category is premium — if so, apply tier-based isBought
    const cat = await this.CategoryRepository.getCategoryById(category);
    if (cat && cat.isPremium) {
      result.items = this.applyPremiumTierIsBought(result.items);
    }

    return result;
  }

  /**
   * For premium items (VIP/SVIP), if the user owns any item in this category,
   * all items with a tier number ≤ the owned tier are marked as isBought = true.
   * e.g. If user owns SVIP-5, then SVIP-1 through SVIP-5 all show isBought: true.
   */
  private applyPremiumTierIsBought(
    items: IStoreItemDocument[],
  ): IStoreItemDocument[] {
    // Find the highest tier the user actually owns (isBought === true from the DB lookup)
    let highestOwnedTier = 0;
    for (const item of items) {
      if ((item as any).isBought) {
        const tier = this.extractPremiumTier(item.name);
        if (tier > highestOwnedTier) {
          highestOwnedTier = tier;
        }
      }
    }

    // If user doesn't own anything, no changes needed
    if (highestOwnedTier === 0) return items;

    // Mark all items with tier ≤ highestOwnedTier as isBought
    for (const item of items) {
      const tier = this.extractPremiumTier(item.name);
      if (tier <= highestOwnedTier) {
        (item as any).isBought = true;
      }
    }

    return items;
  }

  async updateStoreItemSingle(
    id: string,
    item: Partial<IStoreItem>,
    svgaFile?: Express.Multer.File,
    previewFile?: Express.Multer.File,
    logoFile?: Express.Multer.File,
  ): Promise<IStoreItemDocument> {
    const existingItem = await this.ItemRepository.getStoreItemById(id);
    if (!existingItem)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Store item with id ${id} not found`,
      );
    if (existingItem.isPremium)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "This api is not for premium items",
      );

    if (svgaFile) {
      // deleting the previous file
      const deleteStatus = await deleteFileFromCloudinary(
        existingItem.svgaFile!,
      );
      if (!deleteStatus) {
        console.warn(
          `[StoreService] Failed to delete previous SVGA file from Cloudinary: ${existingItem.svgaFile}`,
        );
      }
      const url = await uploadFileToCloudinary({
        folder: "store_items",
        file: svgaFile,
      });
      item.svgaFile = url;
    }

    if (previewFile) {
      // deleting the previous file
      if (existingItem.previewFile) {
        await deleteFileFromCloudinary(existingItem.previewFile);
      }
      const url = await uploadFileToCloudinary({
        folder: "store_items",
        file: previewFile,
      });
      item.previewFile = url;
    }

    if (logoFile) {
      if (existingItem.logo) {
        await deleteFileFromCloudinary(existingItem.logo);
      }
      const url = await uploadFileToCloudinary({
        folder: "store_items",
        file: logoFile,
      });
      item.logo = url;
    }

    return await this.ItemRepository.updateStoreItem(id, item);
  }

  async updateStoreItemBatch(
    id: string,
    item: Partial<IStoreItem>,
    files?: IPremiumFiles[],
    logoFile?: Express.Multer.File,
  ): Promise<IStoreItemDocument> {
    let existingItem = await this.ItemRepository.getStoreItemById(id);
    if (!existingItem)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Store item with id ${id} not found`,
      );
    if (!existingItem.isPremium)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "This api is not for single items",
      );

    let urlsBeDeleted = [];

    for (let i = 0; i < existingItem.bundleFiles!.length; i++) {
      for (let j = 0; j < files!.length; j++) {
        if (
          existingItem.bundleFiles![i].categoryName.toString() ==
          files![j].categoryName
        ) {
          urlsBeDeleted.push(existingItem.bundleFiles![i].svgaFile);
          urlsBeDeleted.push(existingItem.bundleFiles![i].previewFile);
          existingItem.bundleFiles = existingItem.bundleFiles?.filter(
            (f) => f.categoryName !== files![j].categoryName,
          );
        }
      }
    }

    // Delete obsolete cloudinary assets in parallel. Failures are logged but
    // not propagated — the new files have already been chosen and we'd
    // rather complete the update than block on stale cleanup.
    await Promise.all(
      urlsBeDeleted.map(async (url) => {
        const ok = await deleteFileFromCloudinary(url);
        if (!ok) console.error(`Failed to delete file: ${url}`);
      }),
    );

    // Upload all new bundle files in parallel — same reasoning as the create
    // path: sequential awaits would multiply timeout risk by the file count.
    const newFilesToBeAdded: IBundle[] = await Promise.all(
      files!.map(async (entry) => {
        const svgaSource = entry.svgaFile;
        const previewSource = entry.previewFile;
        const extensionSource = svgaSource ?? previewSource!;
        const extenstion = extensionSource.originalname.split(".").pop() ?? "";

        const [svgaUrl, previewUrl] = await Promise.all([
          svgaSource
            ? uploadFileToCloudinary({
                folder: "store_items",
                file: svgaSource,
              })
            : Promise.resolve(""),
          previewSource
            ? uploadFileToCloudinary({
                folder: "store_items",
                file: previewSource,
              })
            : Promise.resolve(""),
        ]);

        return {
          categoryName: entry.categoryName,
          svgaFile: svgaUrl,
          previewFile: previewUrl,
          fileType: extenstion,
        };
      }),
    );

    if (logoFile) {
      if (existingItem.logo) {
        await deleteFileFromCloudinary(existingItem.logo);
      }
      const url = await uploadFileToCloudinary({
        folder: "store_items",
        file: logoFile,
      });
      item.logo = url;
    }

    let profileToBeUpdated: IStoreItem = {
      name: item.name || existingItem.name,
      logo: item.logo || existingItem.logo,
      categoryId: item.categoryId || existingItem.categoryId,
      isPremium: true,
      prices: item.prices || existingItem.prices,
      bundleFiles: [...existingItem.bundleFiles!, ...newFilesToBeAdded],
      privilege: item.privilege || existingItem.privilege,
    };

    const updated = await this.ItemRepository.updateStoreItem(
      id,
      profileToBeUpdated,
    );
    return updated;
  }

  async getEffectedBucketSummary(itemId: string) {
    const item = await this.ItemRepository.getStoreItemById(itemId);
    if (!item)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Store item with id ${itemId} not found`,
      );
    const userCount = await this.BucketRepository.countUsersByItemId(itemId);
    return {
      itemName: item.name,
      userCount: userCount,
    };
  }

  async deleteStoreItem(id: string): Promise<IStoreItemDocument> {
    const existingItem = await this.ItemRepository.getStoreItemById(id);
    if (!existingItem)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Store item with id ${id} not found`,
      );

    // cleaning files
    if (existingItem.svgaFile)
      await deleteFileFromCloudinary(existingItem.svgaFile);
    if (existingItem.previewFile)
      await deleteFileFromCloudinary(existingItem.previewFile);
    if (existingItem.logo) await deleteFileFromCloudinary(existingItem.logo);

    if (existingItem.bundleFiles) {
      for (const bundle of existingItem.bundleFiles) {
        await deleteFileFromCloudinary(bundle.svgaFile);
        await deleteFileFromCloudinary(bundle.previewFile);
      }
    }

    // if this items has been used by some users, we need to deselect them
    await this.BucketRepository.updateBucketUseStatus(
      { itemId: id, useStatus: true },
      { useStatus: false },
    );

    // Delete all user bucket records for this item
    await this.BucketRepository.deleteByItemId(id);

    return await this.ItemRepository.deleteStoreItemHard(id);
  }

  async changeItemCategory(
    itemId: string,
    newCategory: string,
  ): Promise<IStoreItemDocument> {
    return await this.ItemRepository.updateStoreItem(itemId, {
      categoryId: newCategory,
    });
  }

  // 📌 my buckets

  /**
   * Extracts the numeric tier from a premium item name.
   * e.g. "SVIP-3" → 3, "VIP-10" → 10
   */
  private extractPremiumTier(name: string): number {
    const parts = name.split("-");
    const tier = parseInt(parts[parts.length - 1], 10);
    return isNaN(tier) ? 0 : tier;
  }

  async buyStoreItem(
    ownerId: string,
    itemId: string,
    priceIndex: number = 0,
  ): Promise<IStoreItemDocument> {
    const [user, stats, item] = await Promise.all([
      this.UserRepository.findUserById(ownerId),
      this.userStatsRepository.getUserStats(ownerId),
      this.ItemRepository.getStoreItemById(itemId),
    ]);
    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    if (!stats)
      throw new AppError(StatusCodes.NOT_FOUND, "User stats not found");
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Item not found");

    if (!item.prices || item.prices.length === 0)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Item has no pricing options",
      );
    if (priceIndex < 0 || priceIndex >= item.prices.length)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Invalid price option selected",
      );

    const selectedPrice = item.prices[priceIndex];

    if (selectedPrice.price > stats.coins!)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `for item price ${selectedPrice.price} having ${stats.coins} coins is not enough`,
      );

    // ── Premium tier-upgrade enforcement (VIP / SVIP) ──────────────────────
    // For premium items only one item per category is allowed at a time and
    // the user may only upgrade to a higher tier, never downgrade or re-buy.
    let existingPremiumBucketId: string | null = null;

    if (item.isPremium) {
      const category = await this.CategoryRepository.getCategoryById(
        item.categoryId.toString(),
      );
      if (!category)
        throw new AppError(StatusCodes.NOT_FOUND, "Item category not found");

      if (category.isPremium) {
        // Find the user's current bucket in this premium category (if any)
        const existingPremiumBucket =
          await this.BucketRepository.findBucketByOwnerAndCategory(
            ownerId,
            item.categoryId.toString(),
          );

        if (existingPremiumBucket) {
          const existingItem =
            existingPremiumBucket.itemId as any as IStoreItemDocument;

          if (!existingItem || !existingItem.name) {
            // Orphaned bucket — safe to replace
            existingPremiumBucketId = existingPremiumBucket._id as string;
          } else {
            const existingTier = this.extractPremiumTier(existingItem.name);
            const newTier = this.extractPremiumTier(item.name);

            if (newTier <= existingTier) {
              throw new AppError(
                StatusCodes.BAD_REQUEST,
                `You already own ${existingItem.name} (tier ${existingTier}). ` +
                  `You can only upgrade to a higher tier than ${existingTier}.`,
              );
            }

            // Valid upgrade — mark the old bucket for replacement
            existingPremiumBucketId = existingPremiumBucket._id as string;
          }
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await this.userStatsRepository.updateCoins(
        ownerId,
        -selectedPrice.price,
        session,
      );

      await this.ItemRepository.updateSoldCount(itemId, session);

      const newExpiry = new Date(
        Date.now() + selectedPrice.validity * 24 * 60 * 60 * 1000,
      );

      if (existingPremiumBucketId) {
        // ── Premium upgrade: replace the old bucket with the new item ──────
        await this.BucketRepository.updateBucket(
          existingPremiumBucketId,
          {
            itemId: item._id as string,
            expireAt: newExpiry,
            useStatus: false,
          },
          session,
        );
      } else {
        // ── Normal flow: extend expiry if already owned, else create ───────
        const existingBucket =
          await this.BucketRepository.findBucketByOwnerAndItem(
            ownerId,
            item._id as string,
            session,
          );

        if (existingBucket) {
          throw new AppError(
            StatusCodes.BAD_REQUEST,
            "You already own this item",
          );
        } else {
          await this.BucketRepository.createNewBucket(
            {
              itemId: item._id as string,
              ownerId: ownerId,
              categoryId: item.categoryId,
              expireAt: newExpiry,
            },
            session,
          );
        }
      }

      await session.commitTransaction();
      return item;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getMyBucketByCategory(
    ownerId: string,
    category: string,
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; buckets: IMyBucketDocument[] }> {
    const owner = await this.UserRepository.findUserById(ownerId);
    if (!owner) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    const existingCategory =
      await this.CategoryRepository.getCategoryById(category);
    if (!existingCategory)
      throw new AppError(StatusCodes.NOT_FOUND, "Category not found");
    return await this.BucketRepository.getAllBuckets(ownerId, category, query);
  }

  async getMyBuckets(
    ownerId: string,
    query: Record<string, any>,
  ): Promise<Record<string, IMyBucketDocument[]>> {
    const owner = await this.UserRepository.findUserById(ownerId);
    if (!owner) throw new AppError(StatusCodes.NOT_FOUND, "User not found");

    return await this.BucketRepository.getAllBucketsByCategoryGrouped(ownerId);
  }

  async selectBucket(
    ownerId: string,
    bucketId: string,
  ): Promise<IMyBucketDocument> {
    const [owner, bucket] = await Promise.all([
      this.UserRepository.findUserById(ownerId),
      this.BucketRepository.getBucketsById(bucketId),
    ]);

    if (!owner) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    if (!bucket) throw new AppError(StatusCodes.NOT_FOUND, "Bucket not found");

    if (bucket.ownerId.toString() !== ownerId) {
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        "You are not the owner of this bucket",
      );
    }

    if (bucket.useStatus) {
      return await this.BucketRepository.updateBucket(bucketId, {
        useStatus: false,
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const item = await this.ItemRepository.getStoreItemById(
        bucket.itemId.toString(),
      );
      if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Item not found");

      const equippedBuckets =
        await this.BucketRepository.getEquippedBuckets(ownerId);

      if (!equippedBuckets || equippedBuckets.length === 0) {
        const updated = await this.BucketRepository.updateBucket(
          bucketId,
          { useStatus: true },
          session,
        );
        await session.commitTransaction();
        return updated;
      }

      const itemsToDeselect: string[] = [];
      let targetCategories: string[] = [];

      if (!item.isPremium) {
        const category = await this.CategoryRepository.getCategoryById(
          bucket.categoryId.toString(),
        );
        if (!category)
          throw new AppError(StatusCodes.NOT_FOUND, "Category not found");
        targetCategories = [category.title];
      } else {
        targetCategories = item.bundleFiles?.map((b) => b.categoryName) || [];
      }

      for (const eqBucket of equippedBuckets) {
        const eqItem = eqBucket.itemId as any as IStoreItemDocument;
        const eqCategory = eqBucket.categoryId as any as IStoreCategoryDocument;

        if (!eqItem || !eqItem.name || !eqCategory || !eqCategory.title) {
          itemsToDeselect.push(eqBucket._id as string);
          continue;
        }

        if (!eqItem.isPremium) {
          if (targetCategories.includes(eqCategory.title)) {
            itemsToDeselect.push(eqBucket._id as string);
          }
        } else {
          if (
            eqItem.bundleFiles &&
            eqItem.bundleFiles.some((b) =>
              targetCategories.includes(b.categoryName),
            )
          ) {
            itemsToDeselect.push(eqBucket._id as string);
          }
        }
      }

      if (itemsToDeselect.length > 0) {
        await this.BucketRepository.updateBucketUseStatus(
          { _id: { $in: itemsToDeselect } },
          { useStatus: false },
          session,
        );
      }

      const updated = await this.BucketRepository.updateBucket(
        bucketId,
        { useStatus: true },
        session,
      );

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
