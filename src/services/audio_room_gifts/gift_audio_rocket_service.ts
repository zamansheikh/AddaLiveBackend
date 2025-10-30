import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IGiftAudioRocketDocument } from "../../models/gifts/gift_audio_rocket_model";
import { IGiftAudioRocketRepository } from "../../repository/gifts/gift_audio_rocket_repository";

export interface IGiftAudioRocketService {
  createGiftAudioRocket(
    giftAudioRocket: IGiftAudioRocketDocument
  ): Promise<IGiftAudioRocketDocument>;
  getGiftAudioRocket(): Promise<IGiftAudioRocketDocument>;
  updateGiftAudioRocket(
    giftAudioRocket: Partial<IGiftAudioRocketDocument>
  ): Promise<IGiftAudioRocketDocument>;
}

export class GiftAudioRocketService implements IGiftAudioRocketService {
  repository: IGiftAudioRocketRepository;
  constructor(repository: IGiftAudioRocketRepository) {
    this.repository = repository;
  }

  async createGiftAudioRocket(
    giftAudioRocket: IGiftAudioRocketDocument
  ): Promise<IGiftAudioRocketDocument> {
    return await this.repository.createGiftAudioRocket(giftAudioRocket);
  }

  async getGiftAudioRocket(): Promise<IGiftAudioRocketDocument> {
    return await this.repository.getGiftAudioRocket();
  }

  async updateGiftAudioRocket(
    giftAudioRocket: Partial<IGiftAudioRocketDocument>
  ): Promise<IGiftAudioRocketDocument> {
    await this.repository.getGiftAudioRocket();
    return await this.repository.updateGiftAudioRocket( giftAudioRocket);
  }
}
