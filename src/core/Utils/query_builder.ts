import { Model, Query, FilterQuery, PipelineStage } from "mongoose";

export class QueryBuilder<T> {
    private model: Model<T>;
    private query: Record<string, unknown>;
    public modelQuery: Query<T[], T>;
    public aggregatePipeline: PipelineStage[] = [];
    private useAggregate = false;

    constructor(model: Model<T>, query: Record<string, unknown>) {
        this.model = model;
        this.query = query;
        this.modelQuery = this.model.find();
    }

    search(searchableFields: string[]) {
        const searchTerm = this.query?.searchTerm as string;
        if (searchTerm) {
            const conditions: FilterQuery<T>[] = searchableFields.map((field) => ({
                [field]: { $regex: searchTerm, $options: "i" }
            })) as FilterQuery<T>[];

            if (this.useAggregate) {
                this.aggregatePipeline.push({
                    $match: { $or: conditions }
                });
            } else {
                this.modelQuery = this.model.find({ $or: conditions });
            }
        }

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
        const limit = Number(this.query?.limit || 9999);
        const page = Number(this.query?.page || 1);
        const skip = (page - 1) * limit;

        if (this.useAggregate) {
            this.aggregatePipeline.push({ $skip: skip }, { $limit: limit });
        } else {
            this.modelQuery = this.modelQuery.skip(skip).limit(limit);
        }

        return this;
    }

    aggregate(match: PipelineStage.Match["$match"], lookup: PipelineStage.Lookup["$lookup"]) {
        this.useAggregate = true;
        this.aggregatePipeline = [
            { $match: match },
            { $lookup: lookup }
        ];
        return this;
    }



    async countTotal(): Promise<{ total: number; limit: number; page: number; totalPage: number }> {
        const limit = Number(this.query?.limit || 9999);
        const page = Number(this.query?.page || 1);

        if (this.useAggregate) {
            const matchStage = this.aggregatePipeline.find(stage => '$match' in stage) as PipelineStage.Match;
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
            return this.modelQuery.exec();
        }
    }
}

export interface IPagination {
    total: number,
    limit: number,
    page: number,
    totalPage: number,
}