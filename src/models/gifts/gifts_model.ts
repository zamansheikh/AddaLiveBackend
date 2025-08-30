import mongoose from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";
import { IGiftDocument } from "../../entities/admin/gift_interface";

const GiftSchema = new mongoose.Schema<IGiftDocument>(
  {
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    diamonds: {
      type: Number,
      required: true,
    },
    sendCount: {
      type: Number,
      default: 0,
    },
    coinPrice: {
      type: Number,
      required: true,
    },
    previewImage: {
      type: String,
      required: true,
    },
    svgaImage: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const Gifts = mongoose.model(
  DatabaseNames.Gifts,
  GiftSchema,
  DatabaseNames.Gifts
);

export default Gifts;
