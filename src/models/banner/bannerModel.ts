import mongoose, { Model } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IBanner {
  url: string;
  alt: string;
}

export interface IBannerDocument extends IBanner, mongoose.Document {}

export interface IBannerModel extends Model<IBannerDocument> {}

const bannerSchema = new mongoose.Schema<IBannerDocument>({
  url: { type: String, required: true },
  alt: { type: String, required: true },
});

const BannerModel = mongoose.model<IBannerDocument, IBannerModel>(
  DatabaseNames.Banners,
  bannerSchema,
  DatabaseNames.Banners
);

export default BannerModel;
