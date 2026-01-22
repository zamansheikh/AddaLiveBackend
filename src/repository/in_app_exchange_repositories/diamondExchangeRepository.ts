import AppError from "../../core/errors/app_errors";
import { IDIamondExchange, IDIamondExchangeDocument, IDIamondExchangeModel } from "../../models/in_app_currency_exchange_model/diamond_exchange_model";

export interface IDIamondExchangeRepository {
    createDiamondExchange(coinAmount: number, diamondCost: number): Promise<IDIamondExchangeDocument>;
    getDiamondExchange(): Promise<IDIamondExchangeDocument[]>;
    getDiamondExchangeById(id: string): Promise<IDIamondExchangeDocument>;
    deleteDiamondExchange(id: string): Promise<boolean>;    
    updateDiamondExhange(id: string, data: Partial<IDIamondExchange>): Promise<IDIamondExchangeDocument>;
}

export class DiamondExchangeRepository implements IDIamondExchangeRepository {
    Model: IDIamondExchangeModel;

    constructor(model: IDIamondExchangeModel) {
        this.Model = model;
    }

    async createDiamondExchange(coinAmount: number, diamondCost: number): Promise<IDIamondExchangeDocument> {
        return await this.Model.create({ coinAmount, diamondCost });
    }

    async getDiamondExchange(): Promise<IDIamondExchangeDocument[]> {
        return await this.Model.find();
    }  
    
    async getDiamondExchangeById(id: string): Promise<IDIamondExchangeDocument> {
        const document = await this.Model.findById(id);
        if (!document) {
            throw new AppError(404, "Document not found");
        }
        return document;
    }
     

    async deleteDiamondExchange(id: string): Promise<boolean> {
        const result = await this.Model.findByIdAndDelete(id);
        return result != null;
    }

    async updateDiamondExhange(id: string, data: Partial<IDIamondExchange>): Promise<IDIamondExchangeDocument> {
        const updatedDocument = await this.Model.findByIdAndUpdate(id, data, { new: true });
        if (!updatedDocument) {
            throw new AppError(404, "Document not found");
        }
        return updatedDocument;
    }
}