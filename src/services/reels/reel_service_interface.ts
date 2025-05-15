import { Express } from "express";
import { IReelDocument } from "../../models/reels/reel_interface";

export interface IReelService {
    createReel({ ownerId, body, file }: {ownerId: string,  body: Partial<Record<string, any>>, file?: Express.Multer.File }): Promise<IReelDocument | string | null>;
    editReel({reelID, reelCaption, userId}: {reelID: string, reelCaption: string, userId: string}): Promise<IReelDocument | string | null>;
    reactOnReels({reelId, reaction_type, userID}: {reelId: string, reaction_type: string, userID: string}): Promise<IReelDocument| string | null>;
}
