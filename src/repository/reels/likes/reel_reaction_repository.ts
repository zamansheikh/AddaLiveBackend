import { IReelReactionEntity } from "../../../entities/reel/reel_reaction_entitiy_interface";
import { IReelReactionModel, IReelsReaction } from "../../../models/reels/likes/reels_reaction_interface";
import { IReelReactionRepository } from "./reel_reaction_interface";


export default class ReelsReactionRepostitory implements IReelReactionRepository{
    ReelReactionModel: IReelReactionModel;
    constructor(ReelReactionModel: IReelReactionModel) {
        this.ReelReactionModel = ReelReactionModel;
    }

    async create(ReelEntity: IReelReactionEntity) { 
        const reelReaction =  new this.ReelReactionModel(ReelEntity);
        return await reelReaction.save();
    }

    async findReelReactionById(id: string) { 
        return await this.ReelReactionModel.findById(id);
    }

    async findAllReelReactions() {
        return await this.ReelReactionModel.find();
     }

    async findReelReactionsConditionally(condition: Record<string, string|number> ) { 
        return await this.ReelReactionModel.find(condition);
    }

    async findReelReactopnByIdAndUpdate(id: string, payload: Record<string, any>) { 
        return await this.ReelReactionModel.findByIdAndUpdate(id, payload, {new:true});
    }

    async deleteReactionByID(reelId: string) {
        return this.ReelReactionModel.findByIdAndDelete(reelId);
    }

} 