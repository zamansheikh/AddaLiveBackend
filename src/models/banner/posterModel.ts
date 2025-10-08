import mongoose, { Model } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IPoster {
  url: string;
  alt: string;
}

export interface IPosterDocument extends IPoster, mongoose.Document {}

export interface IPosterModel extends Model<IPosterDocument> {}

const posterSchema = new mongoose.Schema<IPosterDocument>({
  url: { type: String, required: true },
  alt: { type: String, required: true },
});

const PosterModel = mongoose.model<IPosterDocument, IPosterModel>(
  DatabaseNames.Posters,
  posterSchema,
  DatabaseNames.Posters
);

export default PosterModel;
