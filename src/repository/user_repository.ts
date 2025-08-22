import mongoose, { mongo } from "mongoose";
import { IUserEntity } from "../entities/user_entity_interface";
import { IUserDocument, IUserModel } from "../models/user/user_model_interface";
import { DatabaseNames, UserRoles } from "../core/Utils/enums";
import Friendship from "../models/friendship/friendship_model";
import { IPagination, QueryBuilder } from "../core/Utils/query_builder";
import AppError from "../core/errors/app_errors";
import { StatusCodes } from "http-status-codes";

export interface ITextPrivacy {
  whoCanTextMe: string;
  highLevelRequirements: { levelType: string; level: number }[];
}

export interface IUserRepository {
  create(userEntity: IUserEntity): Promise<IUserDocument>;
  findUserById(id: string): Promise<IUserDocument | null>;
  getUserDetailsSelectedField(
    id: string,
    fields: string[]
  ): Promise<IUserDocument>;
  getPopulatedUserById(
    id: string,
    populateFields: string
  ): Promise<IUserDocument | null>;
  findByUID(uid: string): Promise<IUserDocument | null>;
  findAllUser(
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }>;
  findUsersConitionally(
    field: string,
    value: string | number
  ): Promise<IUserDocument[] | null>;
  findUserByIdAndUpdate(
    id: string,
    payload: Record<string, any>
  ): Promise<IUserDocument | null>;
  getUserDetails(details: {
    Id: string;
    myId: string;
  }): Promise<IUserDocument | null>;
  searchUserByEmail(
    email: string,
    query: Record<string, unknown>
  ): Promise<{ pagination: IPagination; users: IUserDocument[] } | null>;
  addPermission(id: string, permission: string): Promise<IUserDocument | null>;
  removePermission(
    id: string,
    permission: string
  ): Promise<IUserDocument | null>;
  getAllModarators(
    query: Record<string, unknown>
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }>;
  setWhoCanTextMe(
    id: string,
    payload: ITextPrivacy
  ): Promise<IUserDocument | null>;
  deleteUserById(id: string): Promise<IUserDocument | null>;
}

export default class UserRepository implements IUserRepository {
  UserModel: IUserModel;
  constructor(UserModel: IUserModel) {
    this.UserModel = UserModel;
  }

  async create(UserEntity: IUserEntity) {
    const user = new this.UserModel(UserEntity);
    return await user.save();
  }

  async findUserById(id: string) {
    return await this.UserModel.findById(id).select("-password");
  }

  async getUserDetailsSelectedField(
    id: string,
    fields: string[]
  ): Promise<IUserDocument> {
    const user = await this.UserModel.findById(id, fields);
    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    return user;
  }

  async getPopulatedUserById(
    id: string,
    populateFields: string
  ): Promise<IUserDocument | null> {
    return await this.UserModel.findById(id)
      .populate(populateFields)
      .select("-password");
  }
  async findByUID(uid: string) {
    return await this.UserModel.findOne({ uid }).select("-password");
  }

  async findAllUser(
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }> {
    const qb = new QueryBuilder(this.UserModel, query);
    const res = qb.aggregate([
      {
        $lookup: {
          from: DatabaseNames.userStats,
          localField: "_id",
          foreignField: "userId",
          as: "stats",
        },
      },

      {
        $unwind: {
          path: "$stats",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          password: 0,
          "stats._id": 0,
        },
      },
    ]);
    const users = res.paginate().sort();
    const pagination = await res.countTotal();
    const data = await res.exec();
    return { users: data, pagination };
  }

  async findUsersConitionally(field: string, value: string | number) {
    return await this.UserModel.find({ [field]: value }).select("-password");
  }

  async findUserByIdAndUpdate(id: string, payload: Record<string, any>) {
    return await this.UserModel.findByIdAndUpdate(id, payload, {
      new: true,
    }).select("-password");
  }

  async searchUserByEmail(
    email: string,
    query: Record<string, unknown>
  ): Promise<{ pagination: IPagination; users: IUserDocument[] } | null> {
    const qb = new QueryBuilder(this.UserModel, query);
    const res = qb.find({ email: { $regex: email, $options: "i" } });
    const users = await res.paginate().sort().exec();
    const pagination = await res.countTotal();
    return { users, pagination };
  }

  async setWhoCanTextMe(
    id: string,
    payload: ITextPrivacy
  ): Promise<IUserDocument | null> {
    return await this.UserModel.findByIdAndUpdate(
      id,
      { ...payload },
      { new: true }
    );
  }

  async addPermission(
    id: string,
    permission: string
  ): Promise<IUserDocument | null> {
    return await this.UserModel.findByIdAndUpdate(
      id,
      { $addToSet: { userPermissions: permission } },
      { new: true }
    );
  }

  async removePermission(
    id: string,
    permission: string
  ): Promise<IUserDocument | null> {
    return await this.UserModel.findByIdAndUpdate(
      id,
      { $pull: { userPermissions: permission } },
      { new: true }
    );
  }

  async getAllModarators(
    query: Record<string, unknown>
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }> {
    const qb = new QueryBuilder(this.UserModel, query);
    const res = qb.find({ userRole: UserRoles.Agency });
    const users = await res.paginate().sort().exec();
    const pagination = await res.countTotal();
    return { users, pagination };
  }
  async getUserDetails(details: { Id: string; myId: string }) {
    const userObjectId = new mongoose.Types.ObjectId(details.Id);
    const user = await this.UserModel.aggregate([
      { $match: { _id: userObjectId } },
      {
        $lookup: {
          from: DatabaseNames.friendships,
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    {
                      $and: [
                        {
                          $eq: [
                            "$user1",
                            new mongoose.Types.ObjectId(details.myId),
                          ],
                        },
                        { $eq: ["$user2", "$$userId"] },
                      ],
                    },
                    {
                      $and: [
                        { $eq: ["$user1", "$$userId"] },
                        {
                          $eq: [
                            "$user2",
                            new mongoose.Types.ObjectId(details.myId),
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: "friendshipData",
        },
      },
      {
        $lookup: {
          from: DatabaseNames.followers,
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$myId", new mongoose.Types.ObjectId(details.myId)],
                    },
                    { $eq: ["$followerId", "$$userId"] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: "followerData",
        },
      },
      {
        $lookup: {
          from: DatabaseNames.followers,
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        "$followerId",
                        new mongoose.Types.ObjectId(details.myId),
                      ],
                    },
                    { $eq: ["$myId", "$$userId"] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: "followingData",
        },
      },
      {
        $lookup: {
          from: DatabaseNames.userStats,
          localField: "_id",
          foreignField: "userId",
          as: "stats",
        },
      },
      {
        $unwind: {
          path: "$stats",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          relationship: {
            friendship: {
              $cond: [{ $gt: [{ $size: "$friendshipData" }, 0] }, true, false],
            },
            myFollower: {
              $cond: [{ $gt: [{ $size: "$followerData" }, 0] }, true, false],
            },
            myFollowing: {
              $cond: [{ $gt: [{ $size: "$followingData" }, 0] }, true, false],
            },
          },
        },
      },
      {
        $project: {
          friendshipData: 0,
          followingData: 0,
          followerData: 0,
          password: 0,
        },
      },
    ]);
    return user[0] ?? null;
  }

  async deleteUserById(id: string): Promise<IUserDocument | null> {
    return await this.UserModel.findByIdAndDelete(id);
  }
}
