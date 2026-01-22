import AppError from "../../core/errors/app_errors";
import { IDIamondExchange, IDIamondExchangeDocument } from "../../models/in_app_currency_exchange_model/diamond_exchange_model";
import { IDIamondExchangeRepository } from "../../repository/in_app_exchange_repositories/diamondExchangeRepository";

export interface IDIamondExchangeService {
    createDiamondExchange(coinAmount: number, diamondCost: number): Promise<IDIamondExchangeDocument>;
    getDiamondExchange(): Promise<IDIamondExchangeDocument[]>;
    deleteDiamondExchange(id: string): Promise<boolean>;
    updateDiamondExhange(id: string, data: Partial<IDIamondExchange>): Promise<IDIamondExchangeDocument>;
    exchangeDiamondToCoin(id: string): Promise<number>;
}

export class DiamondExchangeService implements IDIamondExchangeService {
    DiamondExchangeRepository: IDIamondExchangeRepository;
    constructor(diamondExchangeRepository: IDIamondExchangeRepository) {
        this.DiamondExchangeRepository = diamondExchangeRepository;
    }
    async createDiamondExchange(coinAmount: number, diamondCost: number): Promise<IDIamondExchangeDocument> {
        return await this.DiamondExchangeRepository.createDiamondExchange(coinAmount, diamondCost);
    }

    async getDiamondExchange(): Promise<IDIamondExchangeDocument[]> {
        return await this.DiamondExchangeRepository.getDiamondExchange();
    }

    async deleteDiamondExchange(id: string): Promise<boolean> {
        return await this.DiamondExchangeRepository.deleteDiamondExchange(id);
    }

    async updateDiamondExhange(id: string, data: Partial<IDIamondExchange>): Promise<IDIamondExchangeDocument> {
        return await this.DiamondExchangeRepository.updateDiamondExhange(id, data);
    }

    async exchangeDiamondToCoin(id: string): Promise<number> {
        const existingDOcument = await this.DiamondExchangeRepository.getDiamondExchangeById(id);
        if(!existingDOcument) throw new AppError(404, "Document not found");

        return 0
    }
}