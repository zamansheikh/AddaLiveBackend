import { defaultMaxListeners } from "events";
import IMessageRepository, { IUpdateResult } from "./message_repository_interface";
import { IMessage, IMessageDocument, IMessageModel } from "../../../entities/chats/message_interface";
import { IPagination, QueryBuilder } from "../../../core/Utils/query_builder";
import { messagesUserLookUp, messsageUnwind } from "./message_constants";


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

    async getMessages(roomId: string, query: Record<string, any>): Promise<{ pagination: IPagination; data: IMessageDocument[] }> {
        const qb = new QueryBuilder(this.model, query);
        const result = qb.aggregate([
            { $match: { roomId: roomId } },
            messagesUserLookUp("senderId", "senderInfo"),
            messagesUserLookUp("recieverId", "recieverInfo"),
            messsageUnwind("senderInfo"),
            messsageUnwind("recieverInfo"),
            {$project: {
                _id: 1,
                roomId: 1,
                senderId: "$senderInfo",
                recieverId: "$recieverInfo",
                text:1,
                file: 1,
                seen: 1,
                createdAt: 1,
                updatedAt: 1,
                
            }}
        ]).paginate();
        const pagination = await result.countTotal();
        const data = await result.exec();
        return { pagination, data };
    }

    async updateMessage(messageId: string, updates: Partial<IMessage>): Promise<IMessageDocument | null> {
        return await this.model.findByIdAndUpdate(messageId, updates, { new: true });
    }

    async updateSeenStatus(roomId: string): Promise<IUpdateResult | null> {
        return await this.model.updateMany({ roomId: roomId, seen: false }, { seen: true });
    }

    async deleteAllMessage(roomId: string): Promise<boolean | null> {
        return false;
    }
}