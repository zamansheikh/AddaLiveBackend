import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import {
  ISalary,
  ISalaryDocument,
  ISalaryModel,
} from "../../models/salary/salaryModelInterface";
import { StreamType } from "../../core/Utils/enums";

export interface ISalaryRepository {
  createSalary(salary: ISalary): Promise<ISalaryDocument>;
  getAllSalaries(): Promise<ISalaryDocument[]>;
  getSalaryById(id: string): Promise<ISalaryDocument | null>;
  updateSalary(id: string, salary: Partial<ISalary>): Promise<ISalaryDocument>;
  deleteSalary(id: string): Promise<ISalaryDocument>;
  getSalaryByAmount(amount: number): Promise<ISalaryDocument[]>;
}

export default class SalaryRepository implements ISalaryRepository {
  Model: ISalaryModel;

  constructor(model: ISalaryModel) {
    this.Model = model;
  }

  async createSalary(salary: ISalary): Promise<ISalaryDocument> {
    return await this.Model.create(salary);
  }

  async getAllSalaries(): Promise<ISalaryDocument[]> {
    return await this.Model.find({ type: StreamType.Audio });
  }

  async getSalaryById(id: string): Promise<ISalaryDocument | null> {
    return await this.Model.findById(id);
  }

  async updateSalary(
    id: string,
    salary: Partial<ISalary>
  ): Promise<ISalaryDocument> {
    const updated = await this.Model.findByIdAndUpdate(id, salary, {
      new: true,
    });
    if (!updated) throw new AppError(StatusCodes.NOT_FOUND, "Salary not found");
    return updated;
  }

  async deleteSalary(id: string): Promise<ISalaryDocument> {
    const deleted = await this.Model.findByIdAndDelete(id);
    if (!deleted) throw new AppError(StatusCodes.NOT_FOUND, "Salary not found");
    return deleted;
  }

  async getSalaryByAmount(amount: number): Promise<ISalaryDocument[]> {
    const salary = await this.Model.find({ diamondCount: amount });
    if (!salary || salary.length === 0)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Salary with diamond count ${amount} not found`
      );
    return salary;
  }
}
