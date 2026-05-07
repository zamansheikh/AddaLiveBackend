import { StatusCodes } from "http-status-codes";
import cloudinary from "../config/cloudaniay_config";
import AppError from "../errors/app_errors";
import { getCloudinaryPublicId } from "./helper_functions";

/**
 * Cloudinary's single-shot upload endpoint caps the request body at 10 MB on
 * the free plan. Anything bigger needs to go through the chunked endpoint —
 * which is allowed up to 100 MB on free and higher on paid plans. We pick a
 * chunk under the single-shot cap so each chunked request is itself within
 * the limit.
 */
const SINGLE_SHOT_CLOUDINARY_LIMIT = 10 * 1024 * 1024; // 10 MB
const CHUNK_SIZE = 6 * 1024 * 1024; // 6 MB per chunk — well under the cap

export const uploadFileToCloudinary = ({
  file,
  folder = "user_profiles",
}: {
  file: Express.Multer.File;
  folder?: string;
}) => {
  return new Promise<string>((resolve, reject) => {
    const extension = file.originalname.split(".").pop()?.toLowerCase();

    // Standard media types that Cloudinary handles automatically (appending extensions in URLs)
    const standardMedia = [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "svg",
      "mp4",
      "mov",
      "avi",
    ];
    const isRaw = !extension || !standardMedia.includes(extension);

    const options: any = {
      folder,
      resource_type: "auto",
    };

    // For 'raw' files like SVGA, we must include the extension in the public_id
    // to ensure Cloudinary returns a URL with that extension.
    if (isRaw && extension) {
      const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      options.public_id = `${uniqueId}.${extension}`;
      options.resource_type = "raw";
    }

    const callback = (error: any, result: any) => {
      if (error || !result) return reject(error);
      resolve(result.secure_url);
    };

    // Files larger than the single-shot cap (10 MB on free) must go through
    // upload_chunked_stream or Cloudinary returns 400 "File size too large".
    const useChunked = file.buffer.length > SINGLE_SHOT_CLOUDINARY_LIMIT;
    const stream = useChunked
      ? cloudinary.uploader.upload_chunked_stream(
          { ...options, chunk_size: CHUNK_SIZE },
          callback,
        )
      : cloudinary.uploader.upload_stream(options, callback);
    stream.end(file.buffer);
  });
};

export const deleteFileFromCloudinary = async (
  url: string,
): Promise<boolean> => {
  try {
    const publicId = getCloudinaryPublicId(url);
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split("/");
    const resourceType = parts[2]; // This extracts 'image', 'video', or 'raw' from the URL path

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    if (result.result == "not found") {
      console.warn(`[Cloudinary] File not found on Cloudinary: ${url}`);
      return true;
    }

    if (result.result != "ok") {
      console.error(
        `[Cloudinary] Deletion failed for ${url}. Result: ${result.result}`,
      );
      return false;
    }

    return result.result === "ok";
  } catch (error: any) {
    console.error(
      `[Cloudinary] Error during deletion for URL: ${url}. Error: ${error.message}`,
    );
    return false;
  }
};
