import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IStoreCategoryDocument, IStoreCategoryModel } from "../../models/store/store_category_model";

export interface IStoreCategoryRepository {
    createCategory(title: string): Promise<IStoreCategoryDocument>;
    getCategoryById(id: string): Promise<IStoreCategoryDocument | null>;
    getAllCategories(): Promise<IStoreCategoryDocument[]>;
    updateCategory(id: string, title: string): Promise<IStoreCategoryDocument>;
    deleteCategory(id: string): Promise<IStoreCategoryDocument>;
    getCategoryByTitle(title: string): Promise<IStoreCategoryDocument | null>;
}

export default class StoreCategoryRepository implements IStoreCategoryRepository{
    Model: IStoreCategoryModel;
    constructor(model: IStoreCategoryModel) {
        this.Model = model;
    }

    async createCategory(title: string): Promise<IStoreCategoryDocument> {
        const category = new this.Model({ title });
        return await category.save();
    }

    async getCategoryById(id: string): Promise<IStoreCategoryDocument | null> {
        return await this.Model.findById(id);
    }

    async getAllCategories(): Promise<IStoreCategoryDocument[]> {
        return await this.Model.find();
    }

    async deleteCategory(id: string): Promise<IStoreCategoryDocument> {
        const deleted  = await this.Model.findByIdAndDelete(id);
        if(!deleted) throw new AppError(StatusCodes.NOT_FOUND, `Category with id ${id} not found`);
        return deleted;
    }

    async updateCategory(id: string, title: string): Promise<IStoreCategoryDocument> {
        const updated = await this.Model.findByIdAndUpdate(id, { title }, { new: true });
        if(!updated) throw new AppError(StatusCodes.NOT_FOUND, `Category with id ${id} not found`);
        return updated;
    }

    async getCategoryByTitle(title: string): Promise<IStoreCategoryDocument | null> {
        return await this.Model.findOne({ title });
    }
}