import { IReelEntity } from "../../entities/reel_entity_interface";
import { IReelModel } from "../../models/reels/reel_interface";

export default class ReelsRepository {
    ReelModel: IReelModel;
    constructor(ReelModel: IReelModel) {
        this.ReelModel = ReelModel;
    }

    async create(ReelEntity: IReelEntity) { 
        const reel =  new this.ReelModel(ReelEntity);
        return await reel.save();
    }

    async findReelById(id: string) { 
        return await this.ReelModel.findById(id);
    }

    async findAllReels() {
        return await this.ReelModel.find();
     }

    async findReelsConditionally(field: string, value: string | number) { 
        return await this.ReelModel.find({[field]: value});
    }

    async findReelByIdAndUpdate(id: string, payload: Record<string, any>) { 
        return await this.ReelModel.findByIdAndUpdate(id, payload, {new:true});
    }

} 