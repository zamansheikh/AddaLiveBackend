import AppError from "../../core/errors/app_errors";
import ExchangeOptionModel, {
  IExchangeOption,
  IExchangeOptionDocument,
  IExchangeOptionModel,
} from "../../models/coin_exchange/exchange_option_model";

export interface IExchangeOptionRepository {
  create(data: IExchangeOption): Promise<IExchangeOptionDocument>;
  findAll(): Promise<IExchangeOptionDocument[]>;
  findById(id: string): Promise<IExchangeOptionDocument>;
  findByDisplayOrder(displayOrder: number): Promise<IExchangeOptionDocument | null>;
  findByDiamondsRequired(diamondsRequired: number): Promise<IExchangeOptionDocument | null>;
  update(id: string, data: Partial<IExchangeOption>): Promise<IExchangeOptionDocument>;
  delete(id: string): Promise<boolean>;
}

export default class ExchangeOptionRepository implements IExchangeOptionRepository {
  private Model: IExchangeOptionModel;

  constructor(model: IExchangeOptionModel = ExchangeOptionModel) {
    this.Model = model;
  }

  async create(data: IExchangeOption): Promise<IExchangeOptionDocument> {
    return await this.Model.create(data);
  }

  async findByDisplayOrder(displayOrder: number): Promise<IExchangeOptionDocument | null> {
    return await this.Model.findOne({ displayOrder });
  }

  async findByDiamondsRequired(diamondsRequired: number): Promise<IExchangeOptionDocument | null> {
    return await this.Model.findOne({ diamondsRequired });
  }

  async findAll(): Promise<IExchangeOptionDocument[]> {
    return await this.Model.find();
  }

  async findById(id: string): Promise<IExchangeOptionDocument> {
    const document = await this.Model.findById(id);
    if (!document) {
      throw new AppError(404, "Exchange option not found");
    }
    return document;
  }

  async update(id: string, data: Partial<IExchangeOption>): Promise<IExchangeOptionDocument> {
    const updatedDocument = await this.Model.findByIdAndUpdate(id, data, {
      new: true,
      upsert: false,
    });
    if (!updatedDocument) {
      throw new AppError(404, "Exchange option not found");
    }
    return updatedDocument;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.Model.findByIdAndDelete(id);
    return result != null;
  }
}
