import { IPagination } from "../../../core/Utils/query_builder";
import { IMessage, IMessageDocument } from "../../../entities/chats/message_interface";

export default interface IMessageRepository {

    createMessage(message: IMessage): Promise<IMessageDocument | null>

    updateSeenStatus(roomId: string): Promise<IUpdateResult | null>

    getMessages(roomId: string, query: Record<string, any>): Promise<{ pagination: IPagination, data: IMessageDocument[] }>

    getMessageById(messageId: string): Promise<IMessageDocument | null>

    updateMessage(messageId: string, updates: Partial<IMessage>): Promise<IMessageDocument | null>

    deleteMessage(messageId: string): Promise<IMessageDocument | null>;

    deleteAllMessage(roomId: string): Promise<boolean | null>;

}

export interface IUpdateResult {
    acknowledged: boolean,
    matchedCount: number,
    modifiedCount: number,
}