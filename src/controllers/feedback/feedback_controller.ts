import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../core/Utils/catch_async";
import sendResponse from "../../core/Utils/send_response";
import { FeedbackService } from "../../services/feedback/feedback_service";

export class FeedbackController {
  // ── User ────────────────────────────────────────────────────────────────
  sendMessage = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const message = await FeedbackService.sendUserMessage(id, req.body.message);
    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      result: message,
      message: "Message sent",
    });
  });

  getMyThread = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const messages = await FeedbackService.getUserThread(id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: messages,
      message: "Feedback thread retrieved",
    });
  });

  getMyUnreadCount = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const count = await FeedbackService.getUserUnreadCount(id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: { count },
      message: "Unread count retrieved",
    });
  });

  // ── Admin ───────────────────────────────────────────────────────────────
  getThreads = catchAsync(async (req: Request, res: Response) => {
    const result = await FeedbackService.getThreads(
      req.query as { page?: string; limit?: string },
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result,
      message: "Feedback threads retrieved",
    });
  });

  getThread = catchAsync(async (req: Request, res: Response) => {
    const messages = await FeedbackService.getThreadForAdmin(
      req.params.userId,
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: messages,
      message: "Feedback thread retrieved",
    });
  });

  reply = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const message = await FeedbackService.adminReply(
      req.params.userId,
      id,
      req.body.message,
    );
    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      result: message,
      message: "Reply sent",
    });
  });

  getAdminUnreadCount = catchAsync(async (_req: Request, res: Response) => {
    const count = await FeedbackService.getAdminUnreadCount();
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: { count },
      message: "Unread count retrieved",
    });
  });
}
