import { nimbus } from "../nimbus/nimbus_client";

/**
 * Nimbus upload helper shaped like the old `uploadFileToCloudinary` so upload
 * call sites can switch with a one-line change. Uploads a multer file and
 * returns its usable URL (permanent `url`, or the temporary `downloadUrl`).
 *
 * The cloudinary "folder" concept maps to a Nimbus tag (Nimbus organizes by
 * folderId / tags, not folder names).
 */
export const uploadFileToNimbus = ({
  file,
  folder,
}: {
  file: Express.Multer.File;
  folder?: string;
}): Promise<string> =>
  nimbus.uploadAndGetUrl(file, { tags: folder ? [folder] : undefined });

/**
 * Delete an asset from Nimbus by its asset id.
 *
 * NOTE: unlike the cloudinary helper (which deleted by URL), Nimbus deletes by
 * asset `_id`. Persist the id returned at upload time (`upload().uploaded[0]._id`)
 * if you need to delete the asset later.
 */
export const deleteFileFromNimbus = (assetId: string): Promise<boolean> =>
  nimbus.deleteAsset(assetId);
