import { Types } from "mongoose";
import { DatabaseNames } from "../../../core/Utils/enums";
import { QueryBuilder } from "../../../core/Utils/query_builder";
import { IPostComment, IPostCommentDocument, IPostCommentModel } from "../../../entities/posts/posts_comments_interface";
import { IPostCommentRepository } from "./post_commnet_repository_interface";



export default class PostsCommentRepostitory implements IPostCommentRepository {
    PostCommentModel: IPostCommentModel;
    constructor(PostCommentModel: IPostCommentModel) {
        this.PostCommentModel = PostCommentModel;
    }

    async create(PostEntity: IPostComment) {
        const reel = new this.PostCommentModel(PostEntity);
        return await reel.save();
    }

    async findCommentById(commentId: string): Promise<IPostCommentDocument | null> {
        return await this.PostCommentModel.findById(commentId);
    }

    async deleteCommentByID(commentId: string): Promise<IPostCommentDocument | null> {
        return await this.PostCommentModel.findByIdAndDelete(commentId);
    }

    async deleteUserComments(userId: string) {
        return await this.PostCommentModel.deleteMany({ commentedBy: userId });
    }

    async findCommentByIdAndUpdate(commentId: string, payload: Record<string, string>): Promise<IPostCommentDocument | null> {
        return await this.PostCommentModel.findByIdAndUpdate(commentId, payload, { new: true });
    }
    async getAllComments(): Promise<IPostCommentDocument[] | null> {
        return await this.PostCommentModel.find();
    }
    async updateCount(comentId: string, payload: Record<string, number>): Promise<IPostCommentDocument | null> {
        return await this.PostCommentModel.findByIdAndUpdate(comentId, { $inc: payload }, { new: true });
    }

    async getCommentsWithReplies({ postId, userId, query }: { postId: string, userId: string, query: Record<string, any> }) {
        const qb = new QueryBuilder<IPostCommentDocument>(this.PostCommentModel, query);
        console.log(userId);
        
        const result = qb
            .aggregate(
                [
                    { $match: { commentedTo: new Types.ObjectId(postId), parentComment: null } },
                    { $lookup: { from: DatabaseNames.User, localField: "commentedBy", foreignField: "_id", as: "userInfo" } },
                    { $unwind: "$userInfo" },
                    {
                        $lookup: {
                            from: DatabaseNames.PostCommentReactions,
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
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $lookup: {
                            from: DatabaseNames.PostComments,
                            let: { commentId: "$_id" },
                            pipeline: [
                                { $match: { $expr: { $eq: ["$parentComment", "$$commentId"] } } },
                                { $lookup: { from: DatabaseNames.User, localField: "commentedBy", foreignField: "_id", as: "userInfo" } },
                                { $unwind: "$userInfo" },
                                
                                {
                                    $lookup: {
                                        from: DatabaseNames.PostCommentReactions,
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
                                    $addFields: {
                                        userName: "$userInfo.name",
                                        avatar: "$userInfo.avatar",
                                        myReaction: { reactionType: "$myReaction.reactionType" }
                                    }
                                },
                                {
                                    $unwind: {
                                        path: "$myReaction",
                                        preserveNullAndEmptyArrays: true
                                    }
                                },
                                {
                                    $unwind: {
                                        path: "$myReaction.reactionType",
                                        preserveNullAndEmptyArrays: true
                                    }
                                },
                                { $project: { userInfo: 0, myReaction: 0 } }
                            ],
                            as: "replies"
                        }
                    },
                    {
                        $addFields: {
                            userName: "$userInfo.name",
                            avatar: "$userInfo.avatar",
                            myReaction: { reactionType: "$myReaction.reactionType" }
                        }
                    },
                    {
                        $unwind: {
                            path: "$myReaction.reactionType",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $project: {
                            userInfo: 0,
                            myReaction: 0
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