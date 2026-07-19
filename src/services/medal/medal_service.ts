import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../../core/Utils/upload_file_cloudinary";
import { CloudinaryFolder } from "../../core/Utils/enums";
import { IMedal, IMedalDocument } from "../../models/medal/medal_model";
import {
  IMedalRepository,
  IMedalStatusResponse,
} from "../../repository/medal/medal_repository";
import User from "../../models/user/user_model";

export interface IMedalService {
  createMedal(
    name: string,
    level: number,
    icon: Express.Multer.File,
    description?: string,
    levelTag?: Express.Multer.File,
  ): Promise<IMedalDocument>;
  getAllMedals(): Promise<IMedalDocument[]>;
  getMedalById(id: string): Promise<IMedalDocument>;
  getMedalByLevel(level: number): Promise<IMedalDocument | null>;
  updateMedal(
    id: string,
    data: Partial<IMedal>,
    icon?: Express.Multer.File,
    levelTag?: Express.Multer.File,
  ): Promise<IMedalDocument>;
  deleteMedal(id: string): Promise<IMedalDocument>;
  retroactiveAward(): Promise<{
    totalAwarded: number;
    medalsAwarded: { medalName: string; level: number; count: number }[];
  }>;
  getMedalsWithUserStatus(userId: string): Promise<IMedalStatusResponse>;
  equipMedals(userId: string, medalIds: string[]): Promise<IMedalDocument[]>;
}

/** Maximum medals a user can wear ("Current Medal" slots) at once. */
export const MAX_ACTIVE_MEDALS = 10;

export default class MedalService implements IMedalService {
  MedalRepository: IMedalRepository;

  constructor(MedalRepository: IMedalRepository) {
    this.MedalRepository = MedalRepository;
  }

  async createMedal(
    name: string,
    level: number,
    icon: Express.Multer.File,
    description?: string,
    levelTag?: Express.Multer.File,
  ): Promise<IMedalDocument> {
    const existing = await this.MedalRepository.findByLevel(level);
    if (existing) {
      throw new AppError(
        StatusCodes.CONFLICT,
        "A medal already exists for this level",
      );
    }

    const iconUrl = await uploadFileToCloudinary({
      folder: CloudinaryFolder.MedalAssets,
      file: icon,
    });
    if (!iconUrl) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to upload medal icon",
      );
    }

    let levelTagUrl: string | undefined;
    if (levelTag) {
      const uploaded = await uploadFileToCloudinary({
        folder: CloudinaryFolder.MedalAssets,
        file: levelTag,
      });
      if (!uploaded) {
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to upload medal level tag",
        );
      }
      levelTagUrl = uploaded;
    }

    const medalData: IMedal = {
      name,
      level,
      icon: iconUrl,
      levelTag: levelTagUrl,
      description,
    };

    return await this.MedalRepository.create(medalData);
  }

  async getAllMedals(): Promise<IMedalDocument[]> {
    return await this.MedalRepository.findAll();
  }

  async getMedalById(id: string): Promise<IMedalDocument> {
    const medal = await this.MedalRepository.findById(id);
    if (!medal) {
      throw new AppError(StatusCodes.NOT_FOUND, "Medal not found");
    }
    return medal;
  }

  async getMedalByLevel(level: number): Promise<IMedalDocument | null> {
    return await this.MedalRepository.findByLevel(level);
  }

  async updateMedal(
    id: string,
    data: Partial<IMedal>,
    icon?: Express.Multer.File,
    levelTag?: Express.Multer.File,
  ): Promise<IMedalDocument> {
    const existing = await this.MedalRepository.findById(id);
    if (!existing) {
      throw new AppError(StatusCodes.NOT_FOUND, "Medal not found");
    }

    if (data.level && data.level !== existing.level) {
      const levelConflict = await this.MedalRepository.findByLevel(data.level);
      if (levelConflict && levelConflict._id?.toString() !== id) {
        throw new AppError(
          StatusCodes.CONFLICT,
          "A medal already exists for this level",
        );
      }
    }

    if (icon) {
      const iconUrl = await uploadFileToCloudinary({
        folder: CloudinaryFolder.MedalAssets,
        file: icon,
      });
      if (!iconUrl) {
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to upload medal icon",
        );
      }
      await deleteFileFromCloudinary(existing.icon);
      data.icon = iconUrl;
    }

    if (levelTag) {
      const levelTagUrl = await uploadFileToCloudinary({
        folder: CloudinaryFolder.MedalAssets,
        file: levelTag,
      });
      if (!levelTagUrl) {
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to upload medal level tag",
        );
      }
      if (existing.levelTag) {
        await deleteFileFromCloudinary(existing.levelTag);
      }
      data.levelTag = levelTagUrl;
    }

    return await this.MedalRepository.update(id, data);
  }

  async deleteMedal(id: string): Promise<IMedalDocument> {
    const medal = await this.MedalRepository.findById(id);
    if (!medal) {
      throw new AppError(StatusCodes.NOT_FOUND, "Medal not found");
    }

    await deleteFileFromCloudinary(medal.icon);
    if (medal.levelTag) {
      await deleteFileFromCloudinary(medal.levelTag);
    }

    await User.updateMany(
      {},
      { $pull: { earnedMedals: { medalId: medal._id } } },
    );

    return await this.MedalRepository.delete(id);
  }

  async retroactiveAward(): Promise<{
    totalAwarded: number;
    medalsAwarded: { medalName: string; level: number; count: number }[];
  }> {
    const medals = await this.MedalRepository.findAll();
    if (medals.length === 0) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "No medals exist to award. Create medals first.",
      );
    }

    const results: {
      medalName: string;
      level: number;
      count: number;
    }[] = [];

    for (const medal of medals) {
      const result = await User.updateMany(
        {
          level: { $gte: medal.level },
          "earnedMedals.medalId": { $ne: medal._id },
        },
        {
          $push: {
            earnedMedals: {
              medalId: medal._id,
              earnedAt: new Date(),
            },
          },
        },
      );

      results.push({
        medalName: medal.name,
        level: medal.level,
        count: result.modifiedCount,
      });
    }

    const totalAwarded = results.reduce((sum, r) => sum + r.count, 0);

    return { totalAwarded, medalsAwarded: results };
  }

  async getMedalsWithUserStatus(userId: string): Promise<IMedalStatusResponse> {
    return await this.MedalRepository.findMedalsWithUserStatus(userId);
  }

  /**
   * Sets the medals a user is currently wearing.
   *
   * The incoming array is the full desired equipped set (not a toggle) — the
   * order is preserved so it maps to the app's Current Medal slots. Every id
   * must be a medal the user has actually earned, and the set is capped at
   * MAX_ACTIVE_MEDALS. Passing an empty array clears all worn medals.
   */
  async equipMedals(
    userId: string,
    medalIds: string[],
  ): Promise<IMedalDocument[]> {
    if (!Array.isArray(medalIds)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "medalIds must be an array");
    }

    // De-duplicate while keeping the order the user chose.
    const uniqueIds = [...new Set(medalIds.map((id) => String(id)))];

    if (uniqueIds.length > MAX_ACTIVE_MEDALS) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `You can wear at most ${MAX_ACTIVE_MEDALS} medals at once`,
      );
    }

    const user = await User.findById(userId).select("earnedMedals");
    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    const earnedSet = new Set(
      (user.earnedMedals ?? [])
        .map((e: any) => e.medalId?.toString())
        .filter(Boolean),
    );

    for (const id of uniqueIds) {
      if (!earnedSet.has(id)) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          "You can only wear medals you have earned",
        );
      }
    }

    await User.updateOne(
      { _id: userId },
      { $set: { activeMedals: uniqueIds } },
    );

    const updated = await User.findById(userId)
      .select("activeMedals")
      .populate("activeMedals");

    return ((updated as any)?.activeMedals ?? []) as IMedalDocument[];
  }
}
