import { PipelineStage, Types } from "mongoose";
import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { DatabaseNames } from "../../core/Utils/enums";
import FeedbackModel, {
  IFeedbackDocument,
} from "../../models/feedback/feedback_model";

/**
 * Feedback / support conversations between app users and admins.
 * Each user has a single running thread (all Feedback docs with their userId).
 */
export class FeedbackService {
  /** User sends a message to the admins. */
  static async sendUserMessage(
    userId: string,
    message: string,
  ): Promise<IFeedbackDocument> {
    const text = (message ?? "").trim();
    if (!text) throw new AppError(StatusCodes.BAD_REQUEST, "Message is required");

    return FeedbackModel.create({
      userId,
      senderType: "user",
      message: text,
      isReadByUser: true, // the user obviously read their own message
      isReadByAdmin: false,
    });
  }

  /** The logged-in user's thread; also marks admin replies as read. */
  static async getUserThread(userId: string): Promise<IFeedbackDocument[]> {
    await FeedbackModel.updateMany(
      { userId, senderType: "admin", isReadByUser: false },
      { $set: { isReadByUser: true } },
    );
    return FeedbackModel.find({ userId }).sort({ createdAt: 1 });
  }

  /** Count of admin replies the user hasn't read yet (for a badge). */
  static async getUserUnreadCount(userId: string): Promise<number> {
    return FeedbackModel.countDocuments({
      userId,
      senderType: "admin",
      isReadByUser: false,
    });
  }

  /** Admin reply into a user's thread. */
  static async adminReply(
    userId: string,
    adminId: string,
    message: string,
  ): Promise<IFeedbackDocument> {
    const text = (message ?? "").trim();
    if (!text) throw new AppError(StatusCodes.BAD_REQUEST, "Message is required");

    return FeedbackModel.create({
      userId,
      senderType: "admin",
      adminId,
      message: text,
      isReadByUser: false,
      isReadByAdmin: true,
    });
  }

  /** A single user's thread for the admin view; marks user messages as read. */
  static async getThreadForAdmin(
    userId: string,
  ): Promise<IFeedbackDocument[]> {
    await FeedbackModel.updateMany(
      { userId, senderType: "user", isReadByAdmin: false },
      { $set: { isReadByAdmin: true } },
    );
    return FeedbackModel.find({ userId })
      .sort({ createdAt: 1 })
      .populate("adminId", "name userId designation");
  }

  /**
   * The admin inbox: one entry per user who has any feedback, with the last
   * message, the user's unread count (their messages the admin hasn't read),
   * and basic user info. Newest activity first, paginated.
   */
  static async getThreads(query: {
    page?: number | string;
    limit?: number | string;
  }): Promise<{
    data: unknown[];
    pagination: { total: number; page: number; limit: number; totalPage: number };
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip = (page - 1) * limit;

    const base: PipelineStage[] = [
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$userId",
          lastMessage: { $first: "$message" },
          lastSenderType: { $first: "$senderType" },
          lastAt: { $first: "$createdAt" },
          unreadFromUser: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$senderType", "user"] },
                    { $eq: ["$isReadByAdmin", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { lastAt: -1 } },
    ];

    const countResult = await FeedbackModel.aggregate([
      ...base,
      { $count: "total" },
    ]);
    const total = countResult[0]?.total ?? 0;

    const data = await FeedbackModel.aggregate([
      ...base,
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: DatabaseNames.User,
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          lastMessage: 1,
          lastSenderType: 1,
          lastAt: 1,
          unreadFromUser: 1,
          user: {
            _id: 1,
            name: 1,
            userId: 1,
            avatar: 1,
            level: 1,
            email: 1,
          },
        },
      },
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPage: Math.ceil(total / limit),
      },
    };
  }

  /** Total unread user-messages across all threads (admin badge). */
  static async getAdminUnreadCount(): Promise<number> {
    return FeedbackModel.countDocuments({
      senderType: "user",
      isReadByAdmin: false,
    });
  }

  static toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid user id");
    }
    return new Types.ObjectId(id);
  }
}
