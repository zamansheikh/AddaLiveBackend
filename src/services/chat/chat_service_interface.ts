import { IPagination } from "../../core/Utils/query_builder";
import { IConversationDocument } from "../../entities/chats/conversation_interface";
import { IMessage, IMessageDocument } from "../../entities/chats/message_interface";
import { IBlockChat, IBlockChatDocument } from "../../models/chats/block_model";
import { IUpdateResult } from "../../repository/chats/messages/message_repository_interface";

export default interface IChatService {
    sendMessage(message: IMessage, file?: Express.Multer.File): Promise<IMessageDocument | null>

    updateSeenStatus(roomId: string, myId: string): Promise<IUpdateResult | null>;

    editMessage(myId: string, nessageId: string, message: Partial<IMessage>): Promise<IMessageDocument | null>

    deleteMessage(messageId: string, myId: string): Promise<IMessageDocument | null>

    getAllMessage(roomId: string, query: Record<string, any>, myId: string): Promise<{ pagination: IPagination, data: IMessageDocument[] }>

    getAllConversations(myId: string, query: Record<string, any>): Promise<{ pagination: IPagination, data: IConversationDocument[] }>

    deleteConversations(myId: string, roomId: string): Promise<IConversationDocument | null>

    blockUser(myId: string, recieverId: string): Promise<IBlockChatDocument>;

    unblockUser(myId: string, recieverId: string): Promise<IBlockChatDocument>;

    getBlockStatus(myId: string, recieverId: string): Promise<boolean>;

}