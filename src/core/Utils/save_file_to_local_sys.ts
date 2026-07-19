import fs from "fs";
import path from "path";
import { Express, Request, Response } from "express";
import AppError from "../errors/app_errors";
import { StatusCodes } from "http-status-codes";
import catchAsync from "./catch_async";
import sendResponse from "./send_response";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "./upload_file_cloudinary";
import { uploadFileToNimbus } from "./upload_file_nimbus";

interface SaveFileOptions {
  folder: string; // e.g. "store_items"
}

/**
 * Kept for API compatibility, but files are NO LONGER written to the server's
 * disk — they are uploaded to Nimbus cloud storage and the Nimbus URL is
 * returned. The `folder` is passed through as a Nimbus tag.
 */
export const saveFileToLocal = async (
  file: Express.Multer.File,
  options: SaveFileOptions,
): Promise<string> => {
  return uploadFileToNimbus({ file, folder: options.folder });
};

/**
 * Delete a previously-saved file.
 * - Legacy local `/uploads/...` files → removed from disk.
 * - Any other URL (Nimbus, etc.) → best-effort no-op returning `true`.
 */
export const deleteLocalFile = async (fileUrl: string): Promise<boolean> => {
  // Only legacy local uploads live on disk; everything else is in the cloud.
  if (!fileUrl || !fileUrl.startsWith("/uploads/")) {
    return true;
  }
  try {
    const uploadsRoot = path.join(process.cwd(), "public");
    const filePath = path.join(uploadsRoot, fileUrl);
    await fs.promises.access(filePath);
    await fs.promises.unlink(filePath);
    return true;
  } catch (error: any) {
    // File not found → treat as already deleted
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
};

export const saveToLocalFileApiFunction = catchAsync(
  async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) throw new AppError(StatusCodes.BAD_REQUEST, "File is required");
    const uploadUrl = await saveFileToLocal(file!, {
      folder: "room_photo",
    });
    sendResponse(res, {
      success: true,
      message: "Successfully uploaded file",
      result: uploadUrl,
      statusCode: StatusCodes.OK,
    });
  },
);

export const uploadFileCloudFunction = catchAsync(
  async (req: Request, res: Response) => {
    const { folder } = req.body;
    if (!folder)
      throw new AppError(StatusCodes.BAD_REQUEST, "Folder is required");
    const file = req.file;
    if (!file) throw new AppError(StatusCodes.BAD_REQUEST, "File is required");
    const uploadUrl = await uploadFileToCloudinary({ file: file!, folder });
    sendResponse(res, {
      success: true,
      message: "Successfully uploaded file",
      result: uploadUrl,
      statusCode: StatusCodes.OK,
    });
  },
);

export const deleteFileApiFunction = catchAsync(
  async (req: Request, res: Response) => {
    const { fileUrl } = req.body;
    if (!fileUrl)
      throw new AppError(StatusCodes.BAD_REQUEST, "File URL is required");
    const isDeleted = await deleteFileFromCloudinary(fileUrl);
    sendResponse(res, {
      success: true,
      message: "Successfully deleted file",
      result: isDeleted,
      statusCode: StatusCodes.OK,
    });
  },
);
