import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IBanner, IBannerDocument, IBannerModel } from "../../models/banner/bannerModel";
import { IPoster, IPosterDocument, IPosterModel } from "../../models/banner/posterModel";

export interface IPosterRepository {
    createPoster(data: IPoster): Promise<IPosterDocument>;
    getPosters(): Promise<IPosterDocument[]>;
    getRandomPoster(): Promise<IPosterDocument>;
    getPosterById(id: string): Promise<IPosterDocument | null>;
    updatePoster(id: string, data: Partial<IBanner>): Promise<IPosterDocument>;
    deletePoster(id: string): Promise<IPosterDocument>;
}

export default class PosterRepository implements IPosterRepository {
    Model: IPosterModel;

    constructor(model: IPosterModel) {
        this.Model = model;
    }

    async createPoster(data: IPoster): Promise<IPosterDocument> {
        const poster = new this.Model(data);
        return await poster.save();
    }

    async deletePoster(id: string): Promise<IPosterDocument> {
        const deleted = await this.Model.findByIdAndDelete(id);
        if (!deleted) {
            throw new AppError(StatusCodes.NOT_FOUND, "Banner not found");
        }
        return deleted;
    }

    async getPosterById(id: string): Promise<IPosterDocument|null> {
        return await this.Model.findById(id);
    }

    async getPosters(): Promise<IPosterDocument[]> {
        return await this.Model.find();
    }

    async updatePoster(id: string, data: Partial<IBanner>): Promise<IPosterDocument> {
        const updated = await this.Model.findByIdAndUpdate(id, data, { new: true });
        if(!updated) throw new AppError(StatusCodes.NOT_FOUND, "Banner not found");
        return updated;
    }

    async getRandomPoster(): Promise<IPosterDocument> {
        const count = await this.Model.countDocuments();
        const random = Math.floor(Math.random() * count);
        const poster = await this.Model.findOne().skip(random);
        if (!poster) {
            throw new AppError(StatusCodes.NOT_FOUND, "No posters found");
        }
        return poster;
    }

}