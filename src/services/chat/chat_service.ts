import { IPagination } from "../../core/Utils/query_builder";
import { IConversationDocument, IConversationModel } from "../../entities/chats/conversation_interface";
import { IMessage, IMessageDocument, IMessageModel } from "../../entities/chats/message_interface";
import { IConversationRepostiry } from "../../repository/chats/conversations/conversation_repository_interface";
import IMessageRepository from "../../repository/chats/messages/message_repository_interface";
import IChatService from "./chat_service_interface";

export default class ChatService implements IChatService {
    msgRepo: IMessageRepository;
    converseRepo:IConversationRepostiry;

    constructor(msgRepo: IMessageRepository,converseRepo:IConversationRepostiry) {
        this.msgRepo = msgRepo;
        this.converseRepo=converseRepo;
    }

    async sendMessage(message: Partial<IMessage>): Promise<IMessageDocument | null> {
        return null; 
    }
    
    async updateSeenStatus(roomId: string): Promise<IMessageDocument[] | null> {
        return null;
    }

    async deleteMessage(messageId: string): Promise<IMessageDocument | null> {
        return null;
    }

    async editMessage(nessageId: string, message: Partial<IMessage>): Promise<IMessageDocument | null> {
        return null;
    }

    async getAllMessage(roomId: string): Promise<{ pagination: IPagination; data: IMessageDocument[]; }> {
        return {pagination: {} as IPagination,data:[]};
    }
    
    async deleteConversations(myId: string): Promise<IConversationDocument | null> {
         return null;
    }

    async getAllConversations(myId: string): Promise<{ pagination: IPagination; data: IConversationDocument[]; }> {
        return {pagination: {} as IPagination,data:[]};
    }
    
}