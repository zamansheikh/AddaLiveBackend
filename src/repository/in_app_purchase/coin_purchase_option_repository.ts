import AppError from "../../core/errors/app_errors";
import CoinPurchaseOptionModel, {
  ICoinPurchaseOption,
  ICoinPurchaseOptionDocument,
  ICoinPurchaseOptionModel,
} from "../../models/in_app_purchase/coin_purchase_option_model";

export interface ICoinPurchaseOptionRepository {
  create(data: ICoinPurchaseOption): Promise<ICoinPurchaseOptionDocument>;
  findAll(): Promise<ICoinPurchaseOptionDocument[]>;
  findActive(): Promise<ICoinPurchaseOptionDocument[]>;
  findById(id: string): Promise<ICoinPurchaseOptionDocument>;
  findByProductId(productId: string): Promise<ICoinPurchaseOptionDocument | null>;
  findByDisplayOrder(displayOrder: number): Promise<ICoinPurchaseOptionDocument | null>;
  update(id: string, data: Partial<ICoinPurchaseOption>): Promise<ICoinPurchaseOptionDocument>;
  delete(id: string): Promise<boolean>;
}

export default class CoinPurchaseOptionRepository implements ICoinPurchaseOptionRepository {
  private Model: ICoinPurchaseOptionModel;

  constructor(model: ICoinPurchaseOptionModel = CoinPurchaseOptionModel) {
    this.Model = model;
  }

  async create(data: ICoinPurchaseOption): Promise<ICoinPurchaseOptionDocument> {
    return await this.Model.create(data);
  }

  async findAll(): Promise<ICoinPurchaseOptionDocument[]> {
    return await this.Model.find().sort({ displayOrder: 1 });
  }

  async findActive(): Promise<ICoinPurchaseOptionDocument[]> {
    return await this.Model.find({ isActive: true }).sort({ displayOrder: 1 });
  }

  async findById(id: string): Promise<ICoinPurchaseOptionDocument> {
    const document = await this.Model.findById(id);
    if (!document) {
      throw new AppError(404, "Coin purchase option not found");
    }
    return document;
  }

  async findByProductId(productId: string): Promise<ICoinPurchaseOptionDocument | null> {
    return await this.Model.findOne({ productId });
  }

  async findByDisplayOrder(displayOrder: number): Promise<ICoinPurchaseOptionDocument | null> {
    return await this.Model.findOne({ displayOrder });
  }

  async update(id: string, data: Partial<ICoinPurchaseOption>): Promise<ICoinPurchaseOptionDocument> {
    const updatedDocument = await this.Model.findByIdAndUpdate(id, data, {
      new: true,
      upsert: false,
    });
    if (!updatedDocument) {
      throw new AppError(404, "Coin purchase option not found");
    }
    return updatedDocument;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.Model.findByIdAndDelete(id);
    return result != null;
  }
}
