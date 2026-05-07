import mongoose, { Model, mongo } from "mongoose";
import { IUserEntity } from "../../entities/user_entity_interface";
import {
  IUserDocument,
  IUserModel,
  UserData,
} from "../../models/user/user_model_interface";
import {
  ActivityZoneState,
  DatabaseNames,
  UserRoles,
} from "../../core/Utils/enums";
import Friendship from "../../models/friendship/friendship_model";
import { IPagination, QueryBuilder } from "../../core/Utils/query_builder";
import AppError from "../../core/errors/app_errors";
import { StatusCodes } from "http-status-codes";
import { isValidMongooseToken } from "../../core/Utils/helper_functions";

export interface ITextPrivacy {
  whoCanTextMe: string;
  highLevelRequirements: { levelType: string; level: number }[];
}

export interface IUserRepository {
  create(userEntity: IUserEntity): Promise<IUserDocument>;
  findUserById(id: string): Promise<IUserDocument | null>;
  getUserDetailsSelectedField(
    id: string,
    fields: string[],
  ): Promise<IUserDocument | null>;
  getPopulatedUserById(
    id: string,
    populateFields: string,
  ): Promise<IUserDocument | null>;
  findByUID(uid: string): Promise<IUserDocument | null>;
  findUserByEmail(identifier: string): Promise<IUserDocument | null>;
  findAllUser(
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }>;
  findUsersConitionally(
    field: string,
    value: string | number,
  ): Promise<IUserDocument[] | null>;
  findUserByIdAndUpdate(
    id: string,
    payload: Partial<UserData>,
    session?: mongoose.ClientSession,
  ): Promise<IUserDocument | null>;
  getUserDetails(details: {
    Id: string;
    myId: string;
  }): Promise<IUserDocument | null>;
  searchUserByQuery(
    query: Record<string, unknown>,
  ): Promise<{ pagination: IPagination; users: IUserDocument[] } | null>;
  findUserByShortId(id: number): Promise<IUserDocument>;
  addPermission(id: string, permission: string): Promise<IUserDocument | null>;
  removePermission(
    id: string,
    permission: string,
  ): Promise<IUserDocument | null>;
  getAllModarators(
    query: Record<string, unknown>,
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }>;
  setWhoCanTextMe(
    id: string,
    payload: ITextPrivacy,
  ): Promise<IUserDocument | null>;
  deleteUserById(id: string): Promise<IUserDocument | null>;
  getHosts(
    parentId: string,
    query: Record<string, unknown>,
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }>;
  getUserByRole(
    role: UserRoles,
    query: Record<string, unknown>,
  ): Promise<{
    pagination: IPagination;
    users: IUserDocument[];
  }>;

  getUserCounts(role: UserRoles): Promise<number>;
  getHostCounts(parentCreator: string): Promise<number>;
  isPhoneUnique(phoneNumber: string): Promise<boolean>;

  getLatestUserId(): Promise<number>;
  getBannedUsers(query: Record<string, unknown>): Promise<{
    pagination: IPagination;
    users: IUserDocument[];
  }>;
  updateUserXp(
    id: string,
    xp: number,
    session?: mongoose.ClientSession,
  ): Promise<IUserDocument | null>;
  validateUserIds(ids: string[]): Promise<boolean>;
  findUsersByIds(ids: string[]): Promise<IUserDocument[]>;
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

  async getUserDetailsSelectedField(
    id: string,
    fields: string[],
  ): Promise<IUserDocument | null> {
    if (!isValidMongooseToken(id)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid mongoose _id");
    }
    const user = await this.UserModel.findById(id, fields);
    return user;
  }

  async getPopulatedUserById(
    id: string,
    populateFields: string,
  ): Promise<IUserDocument | null> {
    if (!isValidMongooseToken(id)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid mongoose _id");
    }
    return await this.UserModel.findById(id)
      .populate(populateFields)
      .select("-password");
  }
  async findByUID(uid: string) {
    return await this.UserModel.findOne({ uid }).select("-password");
  }

  async findUserByEmail(identifier: any): Promise<IUserDocument | null> {
    const isNumeric =
      !isNaN(identifier) && identifier !== null && identifier !== undefined;
    const numericIdentifier = isNumeric ? Number(identifier) : undefined;

    let orConditions = [];
    orConditions.push(
      { email: identifier }, // String field
      { uid: identifier },
      { phone: identifier },
    );
    if (isNumeric) {
      orConditions.push(
        { premiumId: numericIdentifier },
        { userId: numericIdentifier },
      ); // Number field
    }
    const query = { $or: orConditions };

    return await this.UserModel.findOne(query);
  }

  async findAllUser(
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }> {
    const qb = new QueryBuilder(this.UserModel, query);

    const pipeline = [];

    // only push $match if searchTerm is provided
    if (query.searchTerm && query.searchTerm.trim() !== "") {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: query.searchTerm, $options: "i" } },
            { email: { $regex: query.searchTerm, $options: "i" } },
          ],
        },
      });
    }

    pipeline.push(
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
    );

    const res = qb.aggregate(pipeline);

    const users = res.paginate().sort();
    const pagination = await res.countTotal();
    const data = await res.exec();
    return { users: data, pagination };
  }

  async findUsersConitionally(field: string, value: string | number) {
    return await this.UserModel.find({ [field]: value }).select("-password");
  }

  async findUserByIdAndUpdate(
    id: string,
    payload: Partial<UserData>,
    session?: mongoose.ClientSession,
  ) {
    if (!isValidMongooseToken(id)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid mongoose _id");
    }
    const udpated = await this.UserModel.findByIdAndUpdate(id, payload, {
      new: true,
    }).select("-password");
    if (!udpated) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    return udpated;
  }

  async searchUserByQuery(
    query: Record<string, unknown>,
  ): Promise<{ pagination: IPagination; users: IUserDocument[] } | null> {
    const qb = new QueryBuilder(this.UserModel, query);
    const res = qb.search(["email", "uid"]).sort();
    const users = await res.paginate().sort().exec();
    const pagination = await res.countTotal();
    return { users, pagination };
  }

  async findUserByShortId(id: number): Promise<IUserDocument> {
    const user = await this.UserModel.findOne({
      $or: [{ userId: id }, { premiumId: id }],
    });
    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }
    return user;
  }

  async setWhoCanTextMe(
    id: string,
    payload: ITextPrivacy,
  ): Promise<IUserDocument | null> {
    if (!isValidMongooseToken(id)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid mongoose _id");
    }
    return await this.UserModel.findByIdAndUpdate(
      id,
      { ...payload },
      { new: true },
    );
  }

  async addPermission(
    id: string,
    permission: string,
  ): Promise<IUserDocument | null> {
    if (!isValidMongooseToken(id)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid mongoose _id");
    }
    return await this.UserModel.findByIdAndUpdate(
      id,
      { $addToSet: { userPermissions: permission } },
      { new: true },
    );
  }

  async removePermission(
    id: string,
    permission: string,
  ): Promise<IUserDocument | null> {
    if (!isValidMongooseToken(id)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid mongoose _id");
    }
    return await this.UserModel.findByIdAndUpdate(
      id,
      { $pull: { userPermissions: permission } },
      { new: true },
    );
  }

  async getAllModarators(
    query: Record<string, unknown>,
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }> {
    const qb = new QueryBuilder(this.UserModel, query);
    const res = qb.find({ userRole: UserRoles.Agency });
    const users = await res.paginate().sort().exec();
    const pagination = await res.countTotal();
    return { users, pagination };
  }

  async findUserById(id: string) {
    if (!isValidMongooseToken(id)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid mongoose _id");
    }
    return await this.UserModel.findById(id);
  }

  async getUserDetails(details: { Id: string; myId: string }) {
    const userObjectId = new mongoose.Types.ObjectId(details.Id);
    const myObjectId = new mongoose.Types.ObjectId(details.myId);
    const user = await this.UserModel.aggregate([
      { $match: { _id: userObjectId } },
      {
        $lookup: {
          from: DatabaseNames.Family,
          localField: "familyId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, _id: 1 } }],
          as: "familyId",
        },
      },
      {
        $unwind: {
          path: "$familyId",
          preserveNullAndEmptyArrays: true,
        },
      },
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
                          $eq: ["$user1", myObjectId],
                        },
                        { $eq: ["$user2", "$$userId"] },
                      ],
                    },
                    {
                      $and: [
                        { $eq: ["$user1", "$$userId"] },
                        {
                          $eq: ["$user2", myObjectId],
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
                      $eq: ["$myId", myObjectId],
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
                      $eq: ["$followerId", myObjectId],
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
    if (!isValidMongooseToken(id)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid mongoose _id");
    }
    return await this.UserModel.findByIdAndDelete(id);
  }

  async getHosts(
    parentId: string,
    query: Record<string, unknown>,
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }> {
    const qb = new QueryBuilder(this.UserModel, query);
    const res = qb.find({ parentCreator: parentId });
    const users = await res.paginate().sort().exec();
    const pagination = await res.countTotal();
    return { users, pagination };
  }

  async getUserByRole(
    role: UserRoles,
    query: Record<string, unknown>,
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }> {
    const qb = new QueryBuilder(this.UserModel, query);
    const res = qb.find({ userRole: role });
    const users = await res.paginate().sort().exec();
    const pagination = await res.countTotal();
    return { users, pagination };
  }

  async getUserCounts(role: UserRoles): Promise<number> {
    return await this.UserModel.countDocuments({ userRole: role });
  }

  async getHostCounts(parentCreator: string): Promise<number> {
    return await this.UserModel.countDocuments({
      parentCreator: parentCreator,
    });
  }

  async isPhoneUnique(phoneNumber: string): Promise<boolean> {
    const user = await this.UserModel.findOne({ phone: phoneNumber });
    return user ? false : true;
  }

  async getLatestUserId(): Promise<number> {
    const latestUser = await this.UserModel.findOne({})
      .sort({ userId: -1 }) // Sorts by userId in descending order (highest first)
      .select("userId") // Only retrieve the userId field to keep the document small
      .exec(); // Execute the query

    return latestUser ? latestUser.userId + 1 : 100001;
  }

  async getBannedUsers(
    query: Record<string, unknown>,
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }> {
    const qb = new QueryBuilder(this.UserModel, query);
    const queryCriteria = {
      $or: [
        { "activityZone.zone": ActivityZoneState.permanentBlock },
        {
          "activityZone.zone": ActivityZoneState.temporaryBlock,
          "activityZone.expire": { $gt: new Date().toISOString() },
        },
      ],
    };
    const res = qb.find(queryCriteria);
    const users = await res.paginate().sort().exec();
    const pagination = await res.countTotal();
    return { users, pagination };
  }

  async updateUserXp(
    id: string,
    xp: number,
    session?: mongoose.ClientSession,
  ): Promise<IUserDocument | null> {
    if (!isValidMongooseToken(id)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid mongoose _id");
    }
    const user = await this.UserModel.findByIdAndUpdate(
      id,
      { $inc: { totalEarnedXp: xp } },
      { new: true },
    ).session(session || null);
    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    return user;
  }

  async validateUserIds(ids: string[]): Promise<boolean> {
    const uniqueIds = [...new Set(ids)];
    const count = await this.UserModel.countDocuments({
      _id: { $in: uniqueIds },
    });
    return count === uniqueIds.length;
  }

  async findUsersByIds(ids: string[]): Promise<IUserDocument[]> {
    return await this.UserModel.find({ _id: { $in: ids } });
  }
}
