import { IPagination } from "../../core/Utils/query_builder";
import { IConversationDocument } from "../../entities/chats/conversation_interface";
import { IMessage, IMessageDocument } from "../../entities/chats/message_interface";
import { IUpdateResult } from "../../repository/chats/messages/message_repository_interface";

export default interface IChatService {
    sendMessage(message: IMessage, file?: Express.Multer.File): Promise<IMessageDocument | null>

    updateSeenStatus(roomId: string): Promise<IUpdateResult | null>;

    editMessage(nessageId: string, message: Partial<IMessage>): Promise<IMessageDocument | null>

    deleteMessage(messageId: string): Promise<IMessageDocument | null>

    getAllMessage(roomId: string, query: Record<string, any>): Promise<{pagination: IPagination, data: IMessageDocument[] }>

    getAllConversations(myId: string): Promise<{pagination: IPagination, data: IConversationDocument[] }>

    deleteConversations(myId: string): Promise<IConversationDocument| null>
     
}