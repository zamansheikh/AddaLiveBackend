import { Types } from "mongoose";
import { IReelCommentEntity } from "../../../entities/reel_comment_entity_interface";
import { IReelsCommentDocument, IReelsCommentModel } from "../../../models/reels/comments/reels_comment_interface";
import { DatabaseNames } from "../../../Utils/enums";
import { IReelCommentRepository } from "./reel_comments_interface";

export default class ReelsCommentRepostitory implements IReelCommentRepository {
    ReelCommentModel: IReelsCommentModel;
    constructor(ReelCommentModel: IReelsCommentModel) {
        this.ReelCommentModel = ReelCommentModel;
    }

    async create(ReelEntity: IReelCommentEntity) {
        const reel = new this.ReelCommentModel(ReelEntity);
        return await reel.save();
    }

    async findCommentById(commentId: string): Promise<IReelsCommentDocument | null> {
        return await this.ReelCommentModel.findById(commentId);
    }

    async deleteCommentByID(commentId: string): Promise<IReelsCommentDocument | null> {
        return await this.ReelCommentModel.findByIdAndDelete(commentId);
    }

    async findCommentByIdAndUpdate(commentId: string, payload: Record<string, string>): Promise<IReelsCommentDocument | null> {
        return await this.ReelCommentModel.findByIdAndUpdate(commentId, payload, { new: true });
    }
    async getAllComments(): Promise<IReelsCommentDocument[] | null> {
        return await this.ReelCommentModel.find();
    }
    async updateCount(comentId: string, payload: Record<string, number>): Promise<IReelsCommentDocument | null> {
        return await this.ReelCommentModel.findByIdAndUpdate(comentId, { $inc: payload }, { new: true });
    }

    async getCommentsWithReplies({ reelId }: { reelId: string; }): Promise<IReelsCommentDocument[] | null> {
        const comments = await this.ReelCommentModel.aggregate([
            { $match: { commentedTo: new Types.ObjectId(reelId), parentComment: null } },
            { $lookup: { from: DatabaseNames.ReelsComments, localField: "_id", foreignField: "parentComment", as: "replies" } },
            // {
            //     $project: {
            //         _id: 1,
            //         article: 1,
            //         commentedBy: 1,
            //         createdAt: 1,
            //         replies: {
            //             $map: {
            //                 input: "$replies",
            //                 as: "reply",
            //                 in: {
            //                     _id: "$$reply._id",
            //                     article: "$$reply.article",
            //                     commentedBy: "$$reply.commentedBy",
            //                     createdAt: "$$reply.createdAt"
            //                 }
            //             }
            //         }
            //     }
            // }

        ]);
        console.log("comments ===>>>", comments);

        return comments;
    }

} 