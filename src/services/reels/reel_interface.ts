import { Express } from "express";
import { IReelDocument } from "../../models/reels/reel_interface";

export interface IReelService {
    createReel({ body, file }: { body: Partial<Record<string, any>>, file?: Express.Multer.File }): Promise<IReelDocument | null>;
}
