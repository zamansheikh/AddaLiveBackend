import AppError from "../../core/errors/app_errors";
import {
  IGiftAudioRocket,
  IGiftAudioRocketDocument,
  IGiftAudioRocketModel,
} from "../../models/gifts/gift_audio_rocket_model";

export interface IGiftAudioRocketRepository {
  createGiftAudioRocket(
    giftAudioRocket: IGiftAudioRocket
  ): Promise<IGiftAudioRocketDocument>;
  getGiftAudioRocket(): Promise<IGiftAudioRocketDocument>;
  updateGiftAudioRocket(
    giftAudioRocket: Partial<IGiftAudioRocket>
  ): Promise<IGiftAudioRocketDocument>;
  getGiftAudioRocketById(id: string): Promise<IGiftAudioRocketDocument>;
  getRocketInfoForAudioRoom(): Promise<IGiftAudioRocketDocument | {}>;
}

export class GiftAudioRocketRepository implements IGiftAudioRocketRepository {
  Model: IGiftAudioRocketModel;
  constructor(Model: IGiftAudioRocketModel) {
    this.Model = Model;
  }

  async createGiftAudioRocket(
    giftAudioRocket: IGiftAudioRocket
  ): Promise<IGiftAudioRocketDocument> {
    const existingGiftAudioRocket = await this.Model.findOne();
    if (existingGiftAudioRocket) {
      throw new AppError(400, "Gift Audio Rocket already exists");
    }
    const newGiftAudioRocket = new this.Model(giftAudioRocket);
    return await newGiftAudioRocket.save();
  }

  async getGiftAudioRocket(): Promise<IGiftAudioRocketDocument> {
    const giftAudioRocket = await this.Model.findOne();
    if (!giftAudioRocket) {
      throw new AppError(404, "Gift Audio Rocket not found");
    }
    return giftAudioRocket;
  }

  async updateGiftAudioRocket(
    giftAudioRocket: Partial<IGiftAudioRocket>
  ): Promise<IGiftAudioRocketDocument> {
    const id = await this.Model.findOne();
    if (!id) throw new AppError(404, "Gift Audio Rocket not found");
    const updatedGiftAudioRocket = await this.Model.findByIdAndUpdate(
      id?._id,
      giftAudioRocket,
      { new: true }
    );
    if (!updatedGiftAudioRocket) {
      throw new AppError(404, "Gift Audio Rocket not found");
    }
    return updatedGiftAudioRocket;
  }
  async getGiftAudioRocketById(id: string): Promise<IGiftAudioRocketDocument> {
    const giftAudioRocket = await this.Model.findById(id);
    if (!giftAudioRocket) {
      throw new AppError(404, "Gift Audio Rocket not found");
    }
    return giftAudioRocket;
  }

  async getRocketInfoForAudioRoom(): Promise<IGiftAudioRocketDocument | {}> {
    const giftAudioRocket = await this.Model.findOne();
    if (!giftAudioRocket) {
      return {};
    }
    return giftAudioRocket;
  }
}
