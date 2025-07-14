import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IGift, IGiftDocument, IGiftModel } from "../../entities/admin/gift_interface";

export interface IGiftRepository {
    createGift(gift: IGift): Promise<IGiftDocument>;
    getGifts(): Promise<IGiftDocument[]>;
    updateGift(id: string, gift: Partial<IGift>): Promise<IGiftDocument>;
    deleteGift(id: string): Promise<IGiftDocument>;
}

export class GiftRepository implements IGiftRepository {
    Model: IGiftModel;
    constructor(Model: IGiftModel) {
        this.Model = Model;
    }

    async createGift(gift: IGift): Promise<IGiftDocument> {
        const newGift = new this.Model(gift);
        return await newGift.save();
    }

    async getGifts(): Promise<IGiftDocument[]> {
        return await this.Model.find();
    }

    async updateGift(id: string, gift: Partial<IGift>): Promise<IGiftDocument> {
        const updatedGift = await this.Model.findByIdAndUpdate(id, gift, { new: true });
        if (!updatedGift) throw new AppError(StatusCodes.NOT_FOUND, "Gift not found")
        return updatedGift;
    }

    async deleteGift(id: string): Promise<IGiftDocument> {
        const deletedGift = await this.Model.findByIdAndDelete(id);
        if (!deletedGift) throw new AppError(StatusCodes.NOT_FOUND, "Gift not found")
        return deletedGift;
    }

}