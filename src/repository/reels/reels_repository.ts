import { IReelEntity } from "../../entities/reel_entity_interface";
import { IReelModel } from "../../models/reels/reel_interface";

export default class ReelsRepository {
    ReelModel: IReelModel;
    constructor(ReelModel: IReelModel) {
        this.ReelModel = ReelModel;
    }

    async create(ReelEntity: IReelEntity) { }

    async findReelById(id: string) { }

    async findAllReels() { }

    async findReelsConditionally(field: string, value: string | number) { }

    async findReelByIdAndUpdate() { }

} 