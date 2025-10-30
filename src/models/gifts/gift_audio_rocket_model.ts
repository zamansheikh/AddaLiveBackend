import mongoose, { Document, Model } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IGiftAudioRocket {
  cooldown: number; // in seconds
  milestones: number[]; // milestones for each day
  giftPercentage: number; // the fraction of the gift used as fuel for the rocket
}

export interface IGiftAudioRocketDocument extends IGiftAudioRocket, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IGiftAudioRocketModel
  extends Model<IGiftAudioRocketDocument> {}

const giftAudioRocketSchema = new mongoose.Schema<IGiftAudioRocketDocument>({
  cooldown: {
    type: Number,
    required: true,
  },
  milestones: {
    type: [Number],
    required: true,
    min: 0,
    max: 1,
  },
  giftPercentage: {
    type: Number,
    required: true,
  },
});

const GiftAudioRoomRocketModel = mongoose.model<
  IGiftAudioRocketDocument,
  IGiftAudioRocketModel
>(
  DatabaseNames.GiftAudioRoomRockets,
  giftAudioRocketSchema,
  DatabaseNames.GiftAudioRoomRockets
);

export default GiftAudioRoomRocketModel;
