import mongoose from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IBlockChat {
  blockerId: string | mongoose.Schema.Types.ObjectId;
  blockedId: string | mongoose.Schema.Types.ObjectId;
}

export interface IBlockChatDocument extends mongoose.Document, IBlockChat {
  createdAt: Date;
  updatedAt: Date;
}

export interface IBlockChatModel extends mongoose.Model<IBlockChatDocument> {}

const blockChatSchema = new mongoose.Schema<IBlockChatDocument>(
  {
    blockerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: DatabaseNames.User,
    },
    blockedId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: DatabaseNames.User,
    },
  },
  { timestamps: true }
);

blockChatSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });


const ChatBlockModel = mongoose.model<IBlockChatDocument, IBlockChatModel>(
  DatabaseNames.BlockDocs,
  blockChatSchema,
  DatabaseNames.BlockDocs
);

export default ChatBlockModel;
