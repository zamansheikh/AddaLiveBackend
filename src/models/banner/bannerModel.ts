import mongoose, { Model } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export type BannerLinkType = "none" | "route" | "url";

export interface IBanner {
  url: string;
  alt: string;
  /** What tapping the banner does: nothing, an in-app route, or an external URL. */
  linkType: BannerLinkType;
  /** The route path (e.g. "/store") or external URL. Empty when linkType is "none". */
  linkTarget: string;
}

export interface IBannerDocument extends IBanner, mongoose.Document {}

export interface IBannerModel extends Model<IBannerDocument> {}

const bannerSchema = new mongoose.Schema<IBannerDocument>({
  url: { type: String, required: true },
  alt: { type: String, required: true },
  linkType: {
    type: String,
    enum: ["none", "route", "url"],
    default: "none",
  },
  linkTarget: { type: String, default: "" },
});

const BannerModel = mongoose.model<IBannerDocument, IBannerModel>(
  DatabaseNames.Banners,
  bannerSchema,
  DatabaseNames.Banners
);

export default BannerModel;
