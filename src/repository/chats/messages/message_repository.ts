import IMessageRepository, { IUpdateResult } from "./message_repository_interface";
import { IMessage, IMessageDocument, IMessageModel } from "../../../entities/chats/message_interface";
import { IPagination, QueryBuilder } from "../../../core/Utils/query_builder";
import AppError from "../../../core/errors/app_errors";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";


export default class MessageRepository implements IMessageRepository {
    model: IMessageModel

    constructor(model: IMessageModel) {
        this.model = model
    }

    async createMessage(message: IMessage): Promise<IMessageDocument | null> {
        const newMessage = await this.model.create(message);
        return (await newMessage.populate('senderId', 'email name avatar')).populate('recieverId', 'email name avatar');
    }

    async deleteMessage(messageId: string): Promise<IMessageDocument | null> {
        return await this.model.findByIdAndDelete(messageId);
    }

    async getMessageById(messageId: string): Promise<IMessageDocument | null> {
        return await this.model.findById(messageId);
    }

    async getMessages(roomId: string, query: Record<string, any>, textFrom?: string): Promise<{ pagination: IPagination; data: IMessageDocument[] }> {
        const qb = new QueryBuilder(this.model, query);
        const myId = query.myId;
        if(!myId) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "My UserId is missing");
        let findQuery;
        if (textFrom) {
            findQuery = qb.find({ roomId: roomId, createdAt: { $gt: textFrom }, deletedFor: { $not:  { $elemMatch: { userId: myId}},}});
        }
        else {
            findQuery = qb.find({ roomId: roomId, deletedFor: { $not:  { $elemMatch: { userId: myId}},} });
        }
        const result = findQuery.populateField("senderId", "email name avatar").populateField("recieverId", "email name avatar").sort().paginate();
        const pagination = await result.countTotal();
        const data = await result.exec();
        return { pagination, data };
    }

    async updateMessage(messageId: string, updates: Partial<IMessage>): Promise<IMessageDocument | null> {
        return await this.model.findByIdAndUpdate(messageId, updates, { new: true });
    }

    async updateSeenStatus(roomId: string, recieverId: string): Promise<IUpdateResult | null> {
        const recieverObjectId = new mongoose.Types.ObjectId(recieverId);
        return await this.model.updateMany({ roomId: roomId, recieverId: recieverObjectId, seen: false }, { seen: true });
    }

    async deleteAllMessage(roomId: string): Promise<boolean | null> {
        return false;
    }
}