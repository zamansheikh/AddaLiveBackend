import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../../core/Utils/upload_file_cloudinary";
import { CloudinaryFolder } from "../../core/Utils/enums";
import { IMedal, IMedalDocument } from "../../models/medal/medal_model";
import { IMedalRepository } from "../../repository/medal/medal_repository";
import User from "../../models/user/user_model";

export interface IMedalService {
  createMedal(
    name: string,
    level: number,
    icon: Express.Multer.File,
    description?: string,
  ): Promise<IMedalDocument>;
  getAllMedals(): Promise<IMedalDocument[]>;
  getMedalById(id: string): Promise<IMedalDocument>;
  getMedalByLevel(level: number): Promise<IMedalDocument | null>;
  updateMedal(
    id: string,
    data: Partial<IMedal>,
    icon?: Express.Multer.File,
  ): Promise<IMedalDocument>;
  deleteMedal(id: string): Promise<IMedalDocument>;
  retroactiveAward(): Promise<{
    totalAwarded: number;
    medalsAwarded: { medalName: string; level: number; count: number }[];
  }>;
}

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

    const medalData: IMedal = {
      name,
      level,
      icon: iconUrl,
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
      // Upload new icon first, then delete old one — if upload fails, old icon is preserved
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

    return await this.MedalRepository.update(id, data);
  }

  async deleteMedal(id: string): Promise<IMedalDocument> {
    const medal = await this.MedalRepository.findById(id);
    if (!medal) {
      throw new AppError(StatusCodes.NOT_FOUND, "Medal not found");
    }

    // Clean up Cloudinary icon
    await deleteFileFromCloudinary(medal.icon);

    // Remove the medal from all users' earnedMedals arrays to prevent orphaned references
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
}
