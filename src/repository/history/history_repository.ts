import mongoose from "mongoose";
import { IHistory, IHistoryDocument, IHistoryModel } from "../../entities/history/history_interface";

export interface IHistoryRepository {
    createHistory(history: IHistory): Promise<IHistoryDocument | null>;
    getHistory(userId: string, date: string): Promise<IHistoryDocument[] | null>;
}

export default class HistoryRepository implements IHistoryRepository {
    Model: IHistoryModel;

    constructor(model: IHistoryModel) {
        this.Model = model;
    }

    async createHistory(history: IHistory): Promise<IHistoryDocument | null> {
        const newHistory = new this.Model(history);
        return await newHistory.save();
    }

    async getHistory(id: string, date: string): Promise<IHistoryDocument[] | null> {
        const objectId = new mongoose.Types.ObjectId(id);
        const histories = await this.Model.aggregate(
            [
                { $match: { userId: objectId } },
                {
                    $match: {
                        $expr: {
                            $eq: [
                                { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                                date
                            ]
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        gold: 1,
                        diamond: 1,
                        totalAmount: 1,
                    }
                }
            ]
        );
        return histories;

    }
}