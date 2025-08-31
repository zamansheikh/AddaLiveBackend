import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IBanner, IBannerDocument, IBannerModel } from "../../models/banner/bannerModel";

export interface IBannerRepository {
    createBanner(data: IBanner): Promise<IBannerDocument>;
    getBanners(): Promise<IBannerDocument[]>;
    getBannerById(id: string): Promise<IBannerDocument | null>;
    updateBanner(id: string, data: Partial<IBanner>): Promise<IBannerDocument>;
    deleteBanner(id: string): Promise<IBannerDocument>;
}

export default class BannerRepository implements IBannerRepository {
    Model: IBannerModel;

    constructor(model: IBannerModel) {
        this.Model = model;
    }

    async createBanner(data: IBanner): Promise<IBannerDocument> {
        const banner = new this.Model(data);
        return await banner.save();
    }

    async deleteBanner(id: string): Promise<IBannerDocument> {
        const deleted = await this.Model.findByIdAndDelete(id);
        if (!deleted) {
            throw new AppError(StatusCodes.NOT_FOUND, "Banner not found");
        }
        return deleted;
    }

    async getBannerById(id: string): Promise<IBannerDocument|null> {
        return await this.Model.findById(id);
    }

    async getBanners(): Promise<IBannerDocument[]> {
        return await this.Model.find();
    }

    async updateBanner(id: string, data: Partial<IBanner>): Promise<IBannerDocument> {
        const updated = await this.Model.findByIdAndUpdate(id, data, { new: true });
        if(!updated) throw new AppError(StatusCodes.NOT_FOUND, "Banner not found");
        return updated;
    }

}