import { IPagination } from "../../../core/Utils/query_builder";
import { IConversation, IConversationDocument } from "../../../entities/chats/conversation_interface";

export interface IConversationRepostiry {
<<<<<<< HEAD

=======
>>>>>>> 3daa7017c0d1b6a65da4bab0dbe1fda4aa7177ef
    createConversation(conversation: IConversation): Promise<IConversationDocument | null>

    getConversationByRoomId(id: string): Promise<IConversationDocument | null>

    getAllConversatins(myId: string, query: Record<string, any>): Promise<{ pagination: IPagination, data: IConversationDocument[] }>

    updateConversation(roomId: string, data: Partial<IConversation>): Promise<IConversationDocument | null>;

<<<<<<< HEAD
    deleteConversation(myId: string, roomId: string): Promise<IConversationDocument | null>;

=======
    deleteConversation(roomId: string): Promise<IConversationDocument | null>;
>>>>>>> 3daa7017c0d1b6a65da4bab0dbe1fda4aa7177ef
}