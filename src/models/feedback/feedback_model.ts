import mongoose, { Document, Model, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

/**
 * One message in a user's feedback/support conversation with the admins.
 * A "thread" is simply every Feedback doc sharing the same `userId`.
 */
export interface IFeedback {
  /** The app user the conversation belongs to. */
  userId: mongoose.Types.ObjectId | string;
  /** Who wrote this message. */
  senderType: "user" | "admin";
  message: string;
  /** Portal user (admin) who wrote it — only for admin replies. */
  adminId?: mongoose.Types.ObjectId | string | null;
  /** Read flags, per side, for unread badges. */
  isReadByUser: boolean;
  isReadByAdmin: boolean;
}

export interface IFeedbackDocument extends IFeedback, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IFeedbackModel extends Model<IFeedbackDocument> {}

const feedbackSchema = new Schema<IFeedbackDocument, IFeedbackModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: DatabaseNames.User,
      required: true,
      index: true,
    },
    senderType: {
      type: String,
      enum: ["user", "admin"],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: DatabaseNames.PortalUsers,
      default: null,
    },
    isReadByUser: {
      type: Boolean,
      default: false,
    },
    isReadByAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: DatabaseNames.Feedback,
  },
);

const FeedbackModel = mongoose.model<IFeedbackDocument, IFeedbackModel>(
  DatabaseNames.Feedback,
  feedbackSchema,
  DatabaseNames.Feedback,
);

export default FeedbackModel;
