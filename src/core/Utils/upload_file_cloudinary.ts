import cloudinary from "../config/cloudaniay_config";
import { getCloudinaryPublicId } from "./helper_functions";
import { uploadFileToNimbus } from "./upload_file_nimbus";

/**
 * File uploads now go to Nimbus cloud storage — NOT Cloudinary, and nothing is
 * written to the server's disk. The `uploadFileToCloudinary` name is kept so the
 * many existing call sites keep working unchanged; prefer importing
 * `uploadFileToNimbus` directly in new code.
 *
 * The former `folder` argument is mapped to a Nimbus tag (Nimbus organizes by
 * tags / folderId, not folder names).
 */
export const uploadFileToCloudinary = ({
  file,
  folder,
}: {
  file: Express.Multer.File;
  folder?: string;
}): Promise<string> => uploadFileToNimbus({ file, folder });

/**
 * Delete a previously-uploaded file by its URL.
 *
 * - Legacy Cloudinary URLs → deleted via the Cloudinary API (so old media can
 *   still be cleaned up).
 * - Nimbus / local / any other URL → best-effort no-op returning `true`. Nimbus
 *   deletes by asset `_id`, which these older records don't store; failing here
 *   would break "replace the old file" flows, so we report success instead.
 *   (A leftover Nimbus asset can still be removed from the Nimbus dashboard or
 *   via `nimbus.deleteAsset(id)` when the id is known.)
 */
export const deleteFileFromCloudinary = async (
  url: string,
): Promise<boolean> => {
  if (!url) return false;

  const isCloudinary =
    url.includes("res.cloudinary.com") || url.includes("cloudinary.com");
  if (!isCloudinary) {
    return true;
  }

  try {
    const publicId = getCloudinaryPublicId(url);
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split("/");
    const resourceType = parts[2]; // 'image' | 'video' | 'raw'

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    if (result.result == "not found") {
      console.warn(`[Cloudinary] File not found: ${url}`);
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
