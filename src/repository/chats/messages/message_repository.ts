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
        return await newMessage.save();
    }

    async deleteMessage(messageId: string): Promise<IMessageDocument | null> {
        return await this.model.findByIdAndDelete(messageId);
    }

    async getMessageById(messageId: string): Promise<IMessageDocument | null> {
        return null;
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
                senderId: 1,
                recieverId: 1,
                text:1,
                file: 1,
                seen: 1,
                createdAt: 1,
                updatedAt: 1,
                senderInfo: {
                    name: 1,
                    avatar: 1,
                    email: 1
                },
                recieverInfo: {
                    name: 1,
                    avatar: 1,
                    email: 1
                }
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