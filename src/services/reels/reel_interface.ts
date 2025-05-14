import { Express } from "express";

export interface IReelService {
    createReel({ ownerID, file }: { ownerID: string, file?: Express.Multer.File }): Promise<void>;
}
