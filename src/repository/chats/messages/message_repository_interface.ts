import { IPagination } from "../../../core/Utils/query_builder";
import { IMessage, IMessageDocument } from "../../../entities/chats/message_interface";

export default interface IMessageRepository {

    createMessage(message: IMessage): Promise<IMessageDocument | null>

    updateSeenStatus(roomId: string): Promise<IUpdateResult | null>

<<<<<<< HEAD
    getMessages(roomId: string, query: Record<string, any>, textFrom?: string): Promise<{ pagination: IPagination, data: IMessageDocument[] }>
=======
    getMessages(roomId: string, query: Record<string, any>): Promise<{ pagination: IPagination, data: IMessageDocument[] }>
>>>>>>> 3daa7017c0d1b6a65da4bab0dbe1fda4aa7177ef

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