import AppError from "../../core/errors/app_errors";
import { ICoinPurchaseOption, ICoinPurchaseOptionDocument } from "../../models/in_app_purchase/coin_purchase_option_model";
import { RepositoryProviders } from "../../core/providers/repository_providers";

export interface ICoinPurchaseOptionService {
  create(data: ICoinPurchaseOption): Promise<ICoinPurchaseOptionDocument>;
  getAll(): Promise<ICoinPurchaseOptionDocument[]>;
  update(id: string, data: Partial<ICoinPurchaseOption>): Promise<ICoinPurchaseOptionDocument>;
  delete(id: string): Promise<boolean>;
}

export class CoinPurchaseOptionService implements ICoinPurchaseOptionService {
  private repository = RepositoryProviders.coinPurchaseOptionRepositoryProvider;

  constructor() {}

  async create(data: ICoinPurchaseOption): Promise<ICoinPurchaseOptionDocument> {
    if (!data.productId || data.productId.trim().length === 0) {
      throw new AppError(400, "productId is required");
    }
    if (data.coinAmount <= 0) {
      throw new AppError(400, "coinAmount must be a positive number");
    }
    if (data.bonusCoins < 0) {
      throw new AppError(400, "bonusCoins must be a non-negative number");
    }
    if (data.price <= 0) {
      throw new AppError(400, "price must be a positive number");
    }
    if (data.displayOrder < 0) {
      throw new AppError(400, "displayOrder must be a non-negative number");
    }

    // Check for productId conflict
    const existingProductId = await this.repository.findByProductId(data.productId);
    if (existingProductId) {
      throw new AppError(409, `A purchase option with productId "${data.productId}" already exists`);
    }

    // Check for displayOrder conflict
    const existingDisplayOrder = await this.repository.findByDisplayOrder(data.displayOrder);
    if (existingDisplayOrder) {
      throw new AppError(409, `A purchase option with display order ${data.displayOrder} already exists`);
    }

    return await this.repository.create(data);
  }

  async getAll(): Promise<ICoinPurchaseOptionDocument[]> {
    return await this.repository.findAll();
  }

  async update(id: string, data: Partial<ICoinPurchaseOption>): Promise<ICoinPurchaseOptionDocument> {
    const existingOption = await this.repository.findById(id);

    if (data.productId !== undefined) {
      if (data.productId.trim().length === 0) {
        throw new AppError(400, "productId cannot be empty");
      }
      const existingProductId = await this.repository.findByProductId(data.productId);
      if (existingProductId && (existingProductId._id as any).toString() !== id) {
        throw new AppError(409, `A purchase option with productId "${data.productId}" already exists`);
      }
    }

    if (data.coinAmount !== undefined && data.coinAmount <= 0) {
      throw new AppError(400, "coinAmount must be a positive number");
    }
    if (data.bonusCoins !== undefined && data.bonusCoins < 0) {
      throw new AppError(400, "bonusCoins must be a non-negative number");
    }
    if (data.price !== undefined && data.price <= 0) {
      throw new AppError(400, "price must be a positive number");
    }
    if (data.displayOrder !== undefined && data.displayOrder < 0) {
      throw new AppError(400, "displayOrder must be a non-negative number");
    }

    if (data.displayOrder !== undefined) {
      const existingDisplayOrder = await this.repository.findByDisplayOrder(data.displayOrder);
      if (existingDisplayOrder && (existingDisplayOrder._id as any).toString() !== id) {
        throw new AppError(409, `A purchase option with display order ${data.displayOrder} already exists`);
      }
    }

    return await this.repository.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    await this.repository.findById(id); // existence check
    return await this.repository.delete(id);
  }
}
