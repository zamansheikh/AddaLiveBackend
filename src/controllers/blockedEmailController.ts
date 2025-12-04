import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import { IBlockedEmailRepository } from "../repository/security/blockedEmailRepository";
import AppError from "../core/errors/app_errors";
import { StatusCodes } from "http-status-codes";
import { sendResponseEnhanced } from "../core/Utils/send_response";

export class BlockedEmailController {
  Repository: IBlockedEmailRepository;
  constructor(repository: IBlockedEmailRepository) {
    this.Repository = repository;
  }

  addEmail = catchAsync(async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Email is required");
    }
    const newEmail = await this.Repository.addEmail(email);
    sendResponseEnhanced(res, newEmail);
  });

  getAllEmails = catchAsync(async (req: Request, res: Response) => {
    const emails = await this.Repository.getAllEmails();
    sendResponseEnhanced(res, emails);
  });

  deleteEmail = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const deletedEmail = await this.Repository.deleteEmail(id);
    sendResponseEnhanced(res, deletedEmail);
  });

  getAllEmailsFlat = catchAsync(async (req: Request, res: Response) => {
    const emails = await this.Repository.getAllEmailsFlat();
    sendResponseEnhanced(res, emails);
  });
}
