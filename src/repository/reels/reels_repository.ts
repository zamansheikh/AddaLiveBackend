
import { IReelDocument, IReelModel } from "../../models/reels/reel_interface";
import { IReelRepository } from "./reels_interface";
import { QueryBuilder } from "../../core/Utils/query_builder";
import { IReelEntity } from "../../entities/reel/reel_entity_interface";
import { DatabaseNames } from "../../core/Utils/enums";
import mongoose from "mongoose";
import { reelReactionStructure, reelStructure } from "./reels_reposotory_constants";

export default class ReelsRepository implements IReelRepository {
    ReelModel: IReelModel;
    constructor(ReelModel: IReelModel) {
        this.ReelModel = ReelModel;
    }

    async create(ReelEntity: IReelEntity) {
        const reel = new this.ReelModel(ReelEntity);
        return await reel.save();
    }
    async getAllReels(query: Record<string, any>) {
        const userId = new mongoose.Types.ObjectId(query.userId);

        const qb = new QueryBuilder(this.ReelModel, query);
        const result = qb.aggregate(
            [
                {
                    $lookup: {
                        from: DatabaseNames.User,
                        localField: "ownerId",
                        foreignField: "_id",
                        as: "userInfo"
                    }
                },
                {
                    $lookup: {
                        from: "reels_reactions",
                        let: { reelId: "$_id", userId: userId },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$reactedTo", "$$reelId"] },
                                            { $eq: ["$reactedBy", "$$userId"] }
                                        ]
                                    }
                                }
                            }
                        ],
                        as: "myReaction"
                    }
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
                {
                    $lookup: {
                        from: DatabaseNames.ReelsReactions,
                        let: { reelId: "$_id" },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$reactedTo", "$$reelId"] } } },
                            { $sort: { createdAt: -1 } },
                            { $limit: 10 },
                            {
                                $lookup: {
                                    from: DatabaseNames.User,
                                    localField: "reactedBy",
                                    foreignField: "_id",
                                    as: "userInfo"
                                },
                            },
                            {
                                $unwind: "$userInfo"
                            },
                            {
                                $project: reelReactionStructure
                            }

                        ], as: "latestReactions"
                    }
                },
                reelStructure
            ]
        ).paginate();
        const pagination = await result.countTotal();
        const data = await result.exec();

        return {
            pagination,
            data
        }
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