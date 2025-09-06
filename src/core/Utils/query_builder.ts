import { Model, Query, FilterQuery, PipelineStage, FlattenMaps } from "mongoose";
import AppError from "../errors/app_errors";
import { StatusCodes } from "http-status-codes";

export class QueryBuilder<T> {
  private model: Model<T>;
  private query: Record<string, unknown>;
  public modelQuery: Query<T[], T>;
  public aggregatePipeline: PipelineStage[] = [];
  private useAggregate = false;
  private isLean = false;

  constructor(model: Model<T>, query: Record<string, unknown>) {
    this.model = model;
    this.query = query;
    this.modelQuery = this.model.find();
  }

  useLean() {
    if (!this.useAggregate) {
      this.isLean = true;
      this.modelQuery = this.modelQuery.lean() as any;
    }
    return this;
  }

  search(searchableFields: string[], isObjectId = false) {
    const searchTerm = this.query?.searchTerm as string;
    console.log(searchTerm);

    if (searchTerm) {
      const conditions: FilterQuery<T>[] = searchableFields.map((field) => ({
        [field]: { $regex: searchTerm, $options: "i" },
      })) as FilterQuery<T>[];

      if (this.useAggregate) {
        this.aggregatePipeline.push({
          $match: { $or: conditions },
        });
      } else {
        this.modelQuery = this.modelQuery.find({
          ...this.modelQuery.getFilter(),
          $or: conditions,
        });
      }
    }

    return this;
  }

  find(condition: Record<string, unknown>) {
    if (this.useAggregate)
      throw new AppError(StatusCodes.BAD_REQUEST, "Not Aggregation Query");

    this.modelQuery = this.model.find(condition);

    return this;
  }

  selectField(fields: string) {
    // 📌 exp -> "name email avatar";
    if (this.useAggregate) {
      const projectStage: { [key: string]: number } = {};
      fields.split(" ").forEach((field) => {
        projectStage[field] = 1;
      });
      this.aggregatePipeline.push({ $project: projectStage });
    } else {
      this.modelQuery = this.modelQuery.select(fields);
    }
    return this;
  }

  populateField(field: string, populateWith: string) {
    // field takes the field name you want to populate
    // populate with takes the fields that you want to include in the population
    // the included fields must be in a single string seperated by spaces.
    this.modelQuery = this.modelQuery.populate(field, populateWith);
    return this;
  }

  sort() {
    let sortBy = "-createdAt";

    if (this.query?.sortBy) {
      const order = (this.query.sortOrder as string) === "desc" ? "-" : "";
      sortBy = `${order}${this.query.sortBy}`;
    }

    if (this.useAggregate) {
      const field = sortBy.startsWith("-") ? sortBy.slice(1) : sortBy;
      const direction = sortBy.startsWith("-") ? -1 : 1;
      this.aggregatePipeline.push({ $sort: { [field]: direction } });
    } else {
      this.modelQuery = this.modelQuery.sort(sortBy);
    }

    return this;
  }
  paginate() {
    const limit = Number(this.query?.limit || 10);
    const page = Number(this.query?.page || 1);
    const skip = (page - 1) * limit;

    if (this.useAggregate) {
      this.aggregatePipeline.push({ $skip: skip }, { $limit: limit });
    } else {
      this.modelQuery = this.modelQuery.skip(skip).limit(limit);
    }

    return this;
  }

  aggregate(initialPipeline: PipelineStage[]) {
    this.useAggregate = true;
    this.aggregatePipeline = initialPipeline;
    return this;
  }

  async countTotal(): Promise<{
    total: number;
    limit: number;
    page: number;
    totalPage: number;
  }> {
    const limit = Number(this.query?.limit || 9999);
    const page = Number(this.query?.page || 1);

    if (this.useAggregate) {
      const matchStage = this.aggregatePipeline.find(
        (stage) => "$match" in stage
      ) as PipelineStage.Match;
      const total = await this.model.countDocuments(matchStage?.$match || {});
      return {
        total,
        limit,
        page,
        totalPage: Math.ceil(total / limit),
      };
    } else {
      const filters = this.modelQuery.getFilter();
      const total = await this.model.countDocuments(filters);
      return {
        total,
        limit,
        page,
        totalPage: Math.ceil(total / limit),
      };
    }
  }

  async exec(): Promise<T[]> {
    if (this.useAggregate) {
      return this.model.aggregate(this.aggregatePipeline).exec();
    } else {
      if (this.isLean) {
        return this.modelQuery.lean().exec() as any;
      }
      return this.modelQuery.exec();
    }
  }
}

export interface IPagination {
  total: number;
  limit: number;
  page: number;
  totalPage: number;
}
