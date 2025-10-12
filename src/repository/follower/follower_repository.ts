import { ClientSession, Query, Types } from "mongoose";
import { IPagination, QueryBuilder } from "../../core/Utils/query_builder";
import {
  IFollower,
  IFollowerDocument,
  IFollowerModel,
} from "../../entities/followers/follower_model_interface";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IFollowerRepository {
  createFollower(
    follow: IFollower,
    session?: ClientSession
  ): Promise<IFollowerDocument | null>;
  findFollower(
    follow: IFollower,
    session?: ClientSession
  ): Promise<IFollowerDocument | null>;
  deleteFollowerById(
    id: string,
    session?: ClientSession
  ): Promise<IFollowerDocument | null>;
  getFollowerLists(
    myId: string,
    condition: Record<string, string>,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; data: IFollowerDocument[] } | null>;
  getFollowerCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
}

export default class FollowerRepository implements IFollowerRepository {
  Model: IFollowerModel;
  constructor(model: IFollowerModel) {
    this.Model = model;
  }

  async createFollower(
    follow: IFollower,
    session?: ClientSession
  ): Promise<IFollowerDocument | null> {
    const newFollower = new this.Model(follow);
    return await newFollower.save({ session });
  }

  async findFollower(
    follow: IFollower,
    session?: ClientSession
  ): Promise<IFollowerDocument | null> {
    return await this.Model.findOne(follow).session(session || null);
  }

  async deleteFollowerById(
    id: string,
    session?: ClientSession
  ): Promise<IFollowerDocument | null> {
    return await this.Model.findByIdAndDelete(id).session(session || null);
  }

  async getFollowerLists(
    myId: string,
    condition: Record<string, string>,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; data: IFollowerDocument[] } | null> {
    const myObjectId = new Types.ObjectId(myId);
    const matchLine: Record<string, any> = {};
    let target: string = "";
    let targetFrom: string = "";
    if (condition.myId) {
      matchLine["myId"] = new Types.ObjectId(condition.myId);
      target = "followerId";
      targetFrom = "myId";
    }
    if (condition.followerId) {
      matchLine["followerId"] = new Types.ObjectId(condition.followerId);
      target = "myId";
      targetFrom = "followerId";
    }

    console.log(target, targetFrom);

    const qb = new QueryBuilder(this.Model, query);
    const res = qb
      .aggregate([
        { $match: matchLine },
        {
          $lookup: {
            from: DatabaseNames.User,
            localField: "followerId",
            foreignField: "_id",
            as: "followerInfo",
          },
        },
        {
          $unwind: { path: "$followerInfo", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: DatabaseNames.User,
            localField: "myId",
            foreignField: "_id",
            as: "myInfo",
          },
        },
        {
          $unwind: {
            path: "$myInfo",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $lookup: {
            from: DatabaseNames.followers,
            let: { userId: `$${target}` },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $cond: [
                      // if userId == myId
                      { $eq: ["$$userId", new Types.ObjectId(myId)] },
                      // then make condition false (so it returns no results)
                      true,
                      // else run the real $and conditions
                      {
                        $and: [
                          { $eq: [`$${target}`, new Types.ObjectId(myId)] },
                          { $eq: [`$${targetFrom}`, "$$userId"] },
                        ],
                      },
                    ],
                  },
                },
              },
            ],
            as: "followerData",
          },
        },

        {
          $addFields: {
            canFollow: {
              $cond: {
                if: { $gt: [{ $size: "$followerData" }, 0] },
                then: false,
                else: true,
              },
            },
          },
        },

        {
          $set: {
            followerId: {
              name: "$followerInfo.name",
              id: "$followerInfo._id",
              avatar: "$followerInfo.avatar",
            },

            myId: {
              name: "$myInfo.name",
              id: "$myInfo._id",
              avatar: "$myInfo.avatar",
            },
          },
        },

        {
          $project: {
            followerInfo: 0,
            myInfo: 0,
            followerData: 0,
          },
        },
      ])
      .paginate();
    const data = await res.exec();
    const pagination = await res.countTotal();
    return { pagination, data };
  }

  async getFollowerCount(userId: string): Promise<number> {
    return await this.Model.countDocuments({ myId: userId });
  }

  async getFollowingCount(userId: string): Promise<number> {
    return await this.Model.countDocuments({ followerId: userId });
  }
}
