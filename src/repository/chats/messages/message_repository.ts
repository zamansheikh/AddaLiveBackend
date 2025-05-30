import { defaultMaxListeners } from "events";
import IMessageRepository from "./message_repository_interface";
import { IMessage, IMessageDocument, IMessageModel } from "../../../entities/chats/message_interface";
import { IPagination } from "../../../core/Utils/query_builder";


export default class MessageRepository implements IMessageRepository {
    model: IMessageModel

    constructor(model: IMessageModel) {
        this.model = model
    }

    async createMessage(message: IMessage): Promise<IMessageDocument | null> {

        return null;
    }

    async deleteMessage(messageId: string): Promise<IMessageDocument | null> {
        return null;
    }

    async getMessageById(messageId: string): Promise<IMessageDocument | null> {
        return null;
    }

    async getMessages(roomId: string): Promise<{ pagination: IPagination; data: IMessageDocument[] | null; }> {
        return {pagination: {} as IPagination, data: [] as IMessageDocument[]};
    }
    
    async updateMessage(messageId: string, updates: Partial<IMessage>): Promise<IMessageDocument | null> {
        return null;
    }

    async updateSeenStatus(roomId: string): Promise<IMessageDocument[] | null> {
        return null;
    }

    async deleteAllMessage(roomId: string): Promise<boolean | null> {
        return false;
    }
}