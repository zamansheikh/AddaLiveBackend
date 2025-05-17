import { IReelCommentEntity } from "../../../entities/reel_comment_entity_interface";
import { IReelsCommentDocument, IReelsCommentModel } from "../../../models/reels/comments/reels_comment_interface";
import { IReelCommentRepository } from "./reel_comments_interface";

export default class ReelsCommentRepostitory implements IReelCommentRepository {
    ReelCommentModel: IReelsCommentModel;
    constructor(ReelCommentModel: IReelsCommentModel) {
        this.ReelCommentModel = ReelCommentModel;
    }

    async create(ReelEntity: IReelCommentEntity) { 
        const reel =  new this.ReelCommentModel(ReelEntity);
        return await reel.save();
    }

    async findCommentById(commentId: string): Promise<IReelsCommentDocument | null> {
        return await this.ReelCommentModel.findById(commentId);
    }

    async deleteCommentByID(commentId: string): Promise<IReelsCommentDocument | null> {
        return await this.ReelCommentModel.findByIdAndDelete(commentId);
    }

    async findCommentByIdAndUpdate(commentId: string, payload: Record<string, string>): Promise<IReelsCommentDocument | null> {
        return await this.ReelCommentModel.findByIdAndUpdate(commentId, payload, {new: true});
    }
    async getAllComments(): Promise<IReelsCommentDocument[] | null> {
        return await this.ReelCommentModel.find();
    }
    async updateCount(comentId: string, payload: Record<string, number>): Promise<IReelsCommentDocument | null> {
        return await this.ReelCommentModel.findByIdAndUpdate(comentId, {$inc: payload}, {new: true});
    }

} 