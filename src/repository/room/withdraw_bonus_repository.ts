import { StatusTypes } from "../../core/Utils/enums";
import { IPagination, QueryBuilder } from "../../core/Utils/query_builder";
import { IWithdrawBonus, IWithdrawBonusDocument, IWithdrawBonusModel } from "../../models/room/withdraw_bonus_model";

export interface IWithdrawBonusRepository {
    createWithdrawBonus(data: IWithdrawBonus): Promise<IWithdrawBonusDocument>; 
    getBonusDocument(id: string) : Promise<IWithdrawBonusDocument | null>;
    getWithDrawBonus(query: Record<string, unknown>): Promise<{pagination: IPagination, data:IWithdrawBonusDocument[]}>;
    getBonusWithId(id: string): Promise<IWithdrawBonusDocument | null>;
    updateWithdrawBonus(id: string, data: Record<string, unknown>): Promise<IWithdrawBonusDocument | null>;
}

export default class WithdrawBonusRepository implements IWithdrawBonusRepository {
    Model: IWithdrawBonusModel;

    constructor(model: IWithdrawBonusModel) {
        this.Model = model;
    }

    async createWithdrawBonus(data: IWithdrawBonus): Promise<IWithdrawBonusDocument> {
        const withdrawBonus = new this.Model(data);
        return await withdrawBonus.save();
    }

    async getBonusDocument(id: string): Promise<IWithdrawBonusDocument | null> {
        return await this.Model.findOne({hostId: id, status: StatusTypes.pending});
    }

    async getBonusWithId(id: string): Promise<IWithdrawBonusDocument | null> {
        return await this.Model.findById(id);
    }

    async updateWithdrawBonus(id: string, data: Record<string, unknown>): Promise<IWithdrawBonusDocument | null> {
        return await this.Model.findByIdAndUpdate(id, data, { new: true });
    }
    

    async getWithDrawBonus(query: Record<string, unknown>): Promise<{pagination: IPagination, data:IWithdrawBonusDocument[]}> {
        const qb = new QueryBuilder(this.Model, query);
        const res = qb.sort().find({status: StatusTypes.pending}).paginate();
        const data = await res.exec();
        const pagination = await qb.countTotal();
        return {pagination, data};
    }
}