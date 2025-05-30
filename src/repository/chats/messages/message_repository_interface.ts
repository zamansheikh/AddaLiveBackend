import { IPagination } from "../../../core/Utils/query_builder";
import { IMessage, IMessageDocument } from "../../../entities/chats/message_interface";

export default interface IMessageRepository {

    createMessage(message: IMessage): Promise<IMessageDocument | null> 
    
    updateSeenStatus(roomId: string): Promise<IMessageDocument[] | null>
    
    getMessages(roomId: string): Promise<{pagination: IPagination, data: IMessageDocument[] | null}>

    getMessageById(messageId: string): Promise<IMessageDocument | null>

    updateMessage(messageId: string, updates: Partial<IMessage>): Promise<IMessageDocument | null>

    deleteMessage(messageId: string): Promise<IMessageDocument | null>;

}