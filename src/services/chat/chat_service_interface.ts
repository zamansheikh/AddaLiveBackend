import { IPagination } from "../../core/Utils/query_builder";
import { IConversationDocument } from "../../entities/chats/conversation_interface";
import { IMessage, IMessageDocument } from "../../entities/chats/message_interface";

export default interface IChatService {
    sendMessage(message: Partial<IMessage>): Promise<IMessageDocument | null>

    updateSeenStatus(roomId: string): Promise<IMessageDocument[] | null>;

    editMessage(nessageId: string, message: Partial<IMessage>): Promise<IMessageDocument | null>

    deleteMessage(messageId: string): Promise<IMessageDocument | null>

    getAllMessage(roomId: string): Promise<{pagination: IPagination, data: IMessageDocument[] }>

    getAllConversations(myId: string): Promise<{pagination: IPagination, data: IConversationDocument[] }>

    deleteConversations(myId: string): Promise<IConversationDocument| null>
     
}