import { DeleteResult, Types } from "mongoose";
import { IReelsCommentDocument, IReelsCommentModel } from "../../../models/reels/comments/reels_comment_interface";
import { IReelCommentRepository } from "./reel_comments_interface";
import { DatabaseNames } from "../../../core/Utils/enums";
import { QueryBuilder } from "../../../core/Utils/query_builder";
import { IReelCommentEntity } from "../../../entities/reel/reel_comment_entity_interface";

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

    async deleteUserComments(userId: string): Promise<DeleteResult> {
        return await this.ReelCommentModel.deleteMany({ commentedBy: userId });
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

    async getCommentsWithReplies({ reelId, userId, query }: { reelId: string; userId: string; query: Record<string, any> }) {
        const qb = new QueryBuilder<IReelsCommentDocument>(this.ReelCommentModel, query);
        

        const result = qb
            .aggregate(
                [
                    { $match: { commentedTo: new Types.ObjectId(reelId), parentComment: null } },
                    { $lookup: { from: DatabaseNames.User, localField: "commentedBy", foreignField: "_id", as: "commentedByInfo" } },
                    {
                        $lookup: {
                            from: DatabaseNames.Reels_comment_reaction,
                            let: { cmntId: "$_id", userID: new Types.ObjectId(userId) },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { $eq: ["$reactedTo", "$$cmntId"] },
                                                { $eq: ["$reactedBy", "$$userID"] },
                                            ]
                                        }
                                    }
                                }
                            ],
                            as: "myReaction",
                        }
                    },
                    {
                        $lookup: {
                            from: DatabaseNames.ReelsComments,
                            let: { id: "$_id" },
                            pipeline: [
                                { $match: { $expr: { $eq: ["$parentComment", "$$id"] } } },
                                { $lookup: { from: DatabaseNames.User, localField: "commentedBy", foreignField: "_id", as: "commentedByInfo" } },
                                {
                                    $lookup: {
                                        from: DatabaseNames.Reels_comment_reaction,
                                        let: { cmntId: "$_id", userID: new Types.ObjectId(userId) },
                                        pipeline: [
                                            {
                                                $match: {
                                                    $expr: {
                                                        $and: [
                                                            { $eq: ["$reactedTo", "$$cmntId"] },
                                                            { $eq: ["$reactedBy", "$$userID"] },
                                                        ]
                                                    }
                                                }
                                            }
                                        ],
                                        as: "myReaction",
                                    }
                                },
                                {
                                    $unwind: {
                                        path: "$myReaction",
                                        preserveNullAndEmptyArrays: true,
                                    }
                                },
                                {
                                    $unwind: {
                                        path: "$commentedByInfo",
                                        preserveNullAndEmptyArrays: true,
                                    }
                                },
                            ],
                            as: "replies",
                        }
                    },
                    {
                        $unwind: {
                            path: "$commentedByInfo",
                            preserveNullAndEmptyArrays: true,
                        }
                    },
                    {
                        $unwind: {
                            path: "$myReaction",
                            preserveNullAndEmptyArrays: true,
                        }
                    },
                    {
                        $project: {
                            article: 1,
                            _id: 1,
                            commentedTo: 1,
                            commentedBy: 1,
                            reactionsCount: 1,
                            parentComment: 1,
                            createdAt: 1,
                            updatedAt: 1,
                            myReaction: {
                                reactionType: 1,
                            },
                            commentedByInfo: {
                                _id: 1,
                                name: 1,
                                avatar: 1,
                            },
                            replies: {
                                article: 1,
                                _id: 1,
                                commentedTo: 1,
                                commentedBy: 1,
                                reactionsCount: 1,
                                parentComment: 1,
                                createdAt: 1,
                                updatedAt: 1,
                                myReaction: {
                                    reactionType: 1,
                                },
                                commentedByInfo: {
                                    _id: 1,
                                    name: 1,
                                    avatar: 1,
                                },
                            },
                        }
                    }
                ]
            )
            .paginate()
        const pagination = await result.countTotal();
        const data = await result.exec();

        return {
            pagination,
            data
        }
    }

} 