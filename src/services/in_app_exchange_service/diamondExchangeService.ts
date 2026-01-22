import AppError from "../../core/errors/app_errors";
import {
  IDIamondExchange,
  IDIamondExchangeDocument,
} from "../../models/in_app_currency_exchange_model/diamond_exchange_model";
import { IDIamondExchangeRepository } from "../../repository/in_app_exchange_repositories/diamondExchangeRepository";
import { IUserRepository } from "../../repository/users/user_repository";
import IUserStatsRepository from "../../repository/users/userstats_repository_interface";

export interface IDIamondExchangeService {
  createDiamondExchange(
    coinAmount: number,
    diamondCost: number,
  ): Promise<IDIamondExchangeDocument>;
  getDiamondExchange(): Promise<IDIamondExchangeDocument[]>;
  deleteDiamondExchange(id: string): Promise<boolean>;
  updateDiamondExhange(
    id: string,
    data: Partial<IDIamondExchange>,
  ): Promise<IDIamondExchangeDocument>;
  exchangeDiamondToCoin(id: string, userId: string): Promise<number>;
}

export class DiamondExchangeService implements IDIamondExchangeService {
  DiamondExchangeRepository: IDIamondExchangeRepository;
  UserRepository: IUserRepository;
  UserStatRepository: IUserStatsRepository;
  constructor(
    diamondExchangeRepository: IDIamondExchangeRepository,
    userRepository: IUserRepository,
    userStatRepository: IUserStatsRepository,
  ) {
    this.DiamondExchangeRepository = diamondExchangeRepository;
    this.UserRepository = userRepository;
    this.UserStatRepository = userStatRepository;
  }
  async createDiamondExchange(
    coinAmount: number,
    diamondCost: number,
  ): Promise<IDIamondExchangeDocument> {
    return await this.DiamondExchangeRepository.createDiamondExchange(
      coinAmount,
      diamondCost,
    );
  }

  async getDiamondExchange(): Promise<IDIamondExchangeDocument[]> {
    return await this.DiamondExchangeRepository.getDiamondExchange();
  }

  async deleteDiamondExchange(id: string): Promise<boolean> {
    return await this.DiamondExchangeRepository.deleteDiamondExchange(id);
  }

  async updateDiamondExhange(
    id: string,
    data: Partial<IDIamondExchange>,
  ): Promise<IDIamondExchangeDocument> {
    return await this.DiamondExchangeRepository.updateDiamondExhange(id, data);
  }

  async exchangeDiamondToCoin(id: string, userId: string): Promise<number> {
    // checking the validity of the data came from frontend
    const existingExchangeDocument =
      await this.DiamondExchangeRepository.getDiamondExchangeById(id);
    const exisitngUser = await this.UserRepository.findUserById(userId);
    if (!existingExchangeDocument)
      throw new AppError(404, "Document not found");
    if (!exisitngUser) throw new AppError(404, "User not found");
    const userStats = await this.UserStatRepository.getUserStats(userId);
    if (!userStats || userStats === undefined)
      throw new AppError(404, "User stats not found");

    // checking for balance sufficiency
    if (userStats!.diamonds! < existingExchangeDocument.diamondCost)
      throw new AppError(400, "Insufficient diamonds");

    // updating the user stats -> negating diamond amount and adding coin amount
    userStats.diamonds! -= existingExchangeDocument.diamondCost;
    userStats.coins! += existingExchangeDocument.coinAmount;
    await userStats.save();

    // finally return the coin obtained
    return existingExchangeDocument.coinAmount;
  }
}
