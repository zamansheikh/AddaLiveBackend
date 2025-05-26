import mongoose from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";
import { QueryBuilder } from "../../core/Utils/query_builder";
import { IPost, IPostDocument, IPostModel } from "../../entities/posts/post_interface";
import { postReactionStructure, postStructure } from "./post_repository_constants";
import { IPostRepository } from "./post_repository_interface";


export default class PostRepository implements IPostRepository {
    PostModel: IPostModel;

    constructor(PostModel: IPostModel) {
        this.PostModel = PostModel;
    }

    async create(ReelEntity: IPost) {
        const reel = new this.PostModel(ReelEntity);
        return await reel.save();
    }
    async getAllPosts(query: Record<string, any>) {
        const userId = new mongoose.Types.ObjectId(query.userId);

        console.log(userId);


        const qb = new QueryBuilder(this.PostModel, query);

        const result = qb.aggregate(
            [
                {
                    $lookup: {
                        from: DatabaseNames.User,
                        localField: "ownerId",
                        foreignField: "_id",
                        as: "userInfo",
                    },
                },
                {
                    $lookup: {
                        from: "post_reactions",
                        let: { postId: "$_id", userId: userId },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$reactedTo", "$$postId"] },
                                            { $eq: ["$reactedBy", "$$userId"] }
                                        ]
                                    }
                                }
                            }
                        ],
                        as: "myReaction",
                    },
                },
                {
                    $lookup: {
                        from: DatabaseNames.PostReactions,
                        let: { postId: "$_id" },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$reactedTo", "$$postId"] } } },
                            { $sort: { createdAt: -1 } },
                            { $limit: 10 },
                            {
                                $lookup: {
                                    from: DatabaseNames.User,
                                    localField: "reactedBy",
                                    foreignField: "_id",
                                    as: "userInfo"
                                }
                            },
                            {
                                $unwind: "$userInfo"
                            },

                            {
                                $project: postReactionStructure,
                            }
                        ],
                        as: "latestReactions",
                    },
                },
                {
                    $unwind: {
                        path: "$myReaction",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: "$userInfo"
                },
                postStructure
            ]
        ).paginate();
        const pagination = await result.countTotal();
        const data = await result.exec();

        return {
            pagination,
            data
        }
    }

    async findPostById(id: string) {
        return await this.PostModel.findById(id);
    }

    async findAllPosts() {
        return await this.PostModel.find();
    }

    async findPostsConditionally(condition: Record<string, string | number>) {
        return await this.PostModel.find(condition);
    }

    async updateCount(postID: string, payload: Record<string, number>) {
        return this.PostModel.findByIdAndUpdate(postID, { $inc: payload }, { new: true });
    }

    async deletePostById(reelId: string): Promise<IPostDocument | null> {
        return await this.PostModel.findByIdAndDelete(reelId);
    }


    async findPostByIdAndUpdate(id: string, payload: Record<string, any>) {
        return await this.PostModel.findByIdAndUpdate(id, payload, { new: true });
    }

}