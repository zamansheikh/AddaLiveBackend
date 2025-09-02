import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import { IAppVersionService } from "../services/versions/AppVersionServices";
import AppError from "../core/errors/app_errors";
import { StatusCodes } from "http-status-codes";
import { sendResponseEnhanced } from "../core/Utils/send_response";

export default class AppVersionController {
  Service: IAppVersionService;
  constructor(service: IAppVersionService) {
    this.Service = service;
  }

  createVersion = catchAsync(async (req: Request, res: Response) => {
    const { version, DownloadURL, Release_note } = req.body;
    if (!version || !DownloadURL || !Release_note)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "version, DownloadURL and Release_note are required"
      );
    const result = await this.Service.createVersion({
      DownloadURL,
      Release_note,
      version,
    });
    sendResponseEnhanced(res, result);
  });

  getVersion = catchAsync(async (req: Request, res: Response) => {
    const result = await this.Service.getVersion();
    res.send(result);
  });

  updateVersion = catchAsync(async (req: Request, res: Response) => {
    const { version, Release_note } = req.body;
    if (!version)
      throw new AppError(StatusCodes.BAD_REQUEST, "version is required");
    const result = await this.Service.updateVersion({ Release_note, version });
    sendResponseEnhanced(res, result);
  });
}
