import { IConversation, IConversationDocument } from "../../../entities/chats/conversation_interface";

export interface IConversationRepostiry {
    createConversation(conversation: IConversation): Promise<IConversationDocument| null>
    
}