import mongoose, { Document, Model } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface ILevelTagBg {
  levelTag: string ;
  levelBg: string;
  level: string;
}

export interface ILevelTagBgDocument extends ILevelTagBg, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface ILevelTagBgModel extends Model<ILevelTagBgDocument> {}

const levelTagBgSchema = new mongoose.Schema<ILevelTagBgDocument>(
  {
    levelTag: { type: String, required: true },
    levelBg: { type: String, required: true },
    level: { type: String, required: true,  unique: true },
  },
  {
    timestamps: true,
  }
);

const LevelTagBgModel = mongoose.model<ILevelTagBgDocument, ILevelTagBgModel>(
  DatabaseNames.LevelTagBg,
  levelTagBgSchema,
  DatabaseNames.LevelTagBg
);

export default LevelTagBgModel;
