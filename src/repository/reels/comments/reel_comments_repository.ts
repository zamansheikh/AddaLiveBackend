import { IReelCommentEntity } from "../../../entities/reel_comment_entity_interface";
import { IReelsCommentModel } from "../../../models/reels/comments/reels_comment_interface";

export default class ReelsCommentRepostitory {
    ReelCommentModel: IReelsCommentModel;
    constructor(ReelCommentModel: IReelsCommentModel) {
        this.ReelCommentModel = ReelCommentModel;
    }

    async create(ReelEntity: IReelCommentEntity) { 
        const reel =  new this.ReelCommentModel(ReelEntity);
        return await reel.save();
    }

    async findReelCommentById(id: string) { 
        return await this.ReelCommentModel.findById(id);
    }

    async findAllReelComments() {
        return await this.ReelCommentModel.find();
     }

    async findReelCommentsConditionally(field: string, value: string | number) { 
        return await this.ReelCommentModel.find({[field]: value});
    }

    async findReelReactopnByIdAndUpdate(id: string, payload: Record<string, any>) { 
        return await this.ReelCommentModel.findByIdAndUpdate(id, payload, {new:true});
    }

} 