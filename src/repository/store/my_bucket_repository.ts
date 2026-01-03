import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IPagination, QueryBuilder } from "../../core/Utils/query_builder";
import {
  IMyBucket,
  IMyBucketDocument,
  IMyBucketModel,
} from "../../models/store/my_bucket_model";
import mongoose, { ClientSession, UpdateResult } from "mongoose";

export interface IMyBucketRepository {
  createNewBucket(
    data: IMyBucket,
    session?: ClientSession
  ): Promise<IMyBucketDocument>;
  getBucketsById(id: string): Promise<IMyBucketDocument | null>;
  getAllBuckets(
    ownerId: string,
    categoryId: string,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; buckets: IMyBucketDocument[] }>;
  updateBucket(
    id: string,
    data: Partial<IMyBucket>
  ): Promise<IMyBucketDocument>;
  deleteBucket(id: string): Promise<IMyBucketDocument>;
  updateBucketUseStatus(
    filter: Record<string, any>,
    update: Partial<IMyBucket>,
    session?: ClientSession
  ): Promise<UpdateResult>;
  getEquipedBuckets(id: string): Promise<IMyBucketDocument[]>;
  getAllBucketItems(query: Record<string, any>): Promise<{
    pagination: IPagination;
    items: IMyBucketDocument[];
  }>;
}

export default class MyBucketRepository implements IMyBucketRepository {
  Model: IMyBucketModel;
  constructor(model: IMyBucketModel) {
    this.Model = model;
  }

  async createNewBucket(
    data: IMyBucket,
    session?: ClientSession
  ): Promise<IMyBucketDocument> {
    const bucket = new this.Model(data);
    return await bucket.save({ session });
  }

  async getBucketsById(id: string): Promise<IMyBucketDocument | null> {
    return await this.Model.findById(id);
  }

  async getAllBuckets(
    ownerId: string,
    categoryId: string,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; buckets: IMyBucketDocument[] }> {
    const qb = new QueryBuilder(this.Model, query);
    const res = qb
      .find({ categoryId: categoryId, ownerId: ownerId })
      .populateField("itemId categoryId")
      .sort()
      .paginate();
    const buckets = await res.exec();
    const pagination = await res.countTotal();
    return { pagination, buckets };
  }

  async updateBucket(
    id: string,
    data: Partial<IMyBucket>
  ): Promise<IMyBucketDocument> {
    const updated = await this.Model.findByIdAndUpdate(id, data, { new: true }).populate("itemId categoryId");
    if (!updated)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Bucket with id ${id} not found`
      );
    return updated;
  }

  async deleteBucket(id: string): Promise<IMyBucketDocument> {
    const deleted = await this.Model.findByIdAndDelete(id);
    if (!deleted)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Bucket with id ${id} not found`
      );
    return deleted;
  }

  async updateBucketUseStatus(
    filter: Record<string, any>,
    update: Partial<IMyBucket>,
    session?: ClientSession
  ): Promise<UpdateResult> {
    return await this.Model.updateOne(filter, update, { session });
  }

  async getEquipedBuckets(id: string): Promise<IMyBucketDocument[]> {
    const equipped = await this.Model.find({
      ownerId: id,
      useStatus: true,
    }).populate("itemId categoryId");
    if(!equipped) throw new AppError(StatusCodes.NOT_FOUND, "buckets not found");
    return equipped;
  }

  async getAllBucketItems(query: Record<string, any>): Promise<{ pagination: IPagination; items: IMyBucketDocument[]; }> {
    const qb = new QueryBuilder(this.Model, query);
    const res = qb.find({}).populateField("itemId categoryId").sort().paginate();
    const items = await res.exec();
    const pagination = await res.countTotal();
    return { pagination, items };
  }
}
