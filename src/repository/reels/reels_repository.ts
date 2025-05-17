import { IReelEntity } from "../../entities/reel_entity_interface";
import { IReelDocument, IReelModel } from "../../models/reels/reel_interface";
import { IReelRepository } from "./reels_interface";

export default class ReelsRepository implements IReelRepository {
    ReelModel: IReelModel;
    constructor(ReelModel: IReelModel) {
        this.ReelModel = ReelModel;
    }

    async create(ReelEntity: IReelEntity) {
        const reel = new this.ReelModel(ReelEntity);
        return await reel.save();
    }

    async findReelById(id: string) {
        return await this.ReelModel.findById(id);
    }

    async findAllReels() {
        return await this.ReelModel.find();
    }

    async findReelsConditionally(condition: Record<string, string | number>) {
        return await this.ReelModel.find(condition);
    }

    async updateCount({ reelId, count, isReaction }: { reelId: string, count: number, isReaction: boolean }) {
        return this.ReelModel.findByIdAndUpdate(reelId, { $inc: { [isReaction ? "reactions" : "comments"]: count } }, { new: true });
    }

    async deleteReelById(reelId: string): Promise<IReelDocument | null> {
        return await this.ReelModel.findByIdAndDelete(reelId);
    }


    async findReelByIdAndUpdate(id: string, payload: Record<string, any>) {
        return await this.ReelModel.findByIdAndUpdate(id, payload, { new: true });
    }

} 