import { IPagination } from "../../../core/Utils/query_builder";
import { IConversation, IConversationDocument } from "../../../entities/chats/conversation_interface";

export interface IConversationRepostiry {
    createConversation(conversation: IConversation): Promise<IConversationDocument | null>

    getConversationById(id: string): Promise<IConversationDocument | null>

    getAllConversatins(myId: string): Promise<{ pagination: IPagination, data: IConversationDocument[] }>

    updateConversation(roomId: string, data: Partial<IConversation>): Promise<IConversationDocument | null>;

    deleteConversation(roomId: string): Promise<IConversationDocument | null>;
}