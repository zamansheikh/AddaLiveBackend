import { IPagination } from "../../../core/Utils/query_builder";
import { IConversation, IConversationDocument, IConversationModel } from "../../../entities/chats/conversation_interface";
import { IConversationRepostiry } from "./conversation_repository_interface";


export default class ConversationRepository implements IConversationRepostiry {
    model: IConversationModel

    constructor(model: IConversationModel) {
        this.model = model
    }

    async createConversation(conversation: IConversation): Promise<IConversationDocument | null> {
        const newConversation = new this.model(conversation);
        return await newConversation.save();
    }

    async deleteConversation(roomId: string): Promise<IConversationDocument | null> {
        return null;
    }

    async getAllConversatins(myId: string): Promise<{ pagination: IPagination; data: IConversationDocument[]; }> {
        return { pagination: {} as IPagination, data: [] };
    }

    async getConversationByRoomId(id: string): Promise<IConversationDocument | null> {
        return await this.model.findOne({ roomId: id });
    }

    async updateConversation(roomId: string, data: Partial<IConversation>): Promise<IConversationDocument | null> {
        return await this.model.findOneAndUpdate({ roomId }, data, { new: true });
    }


}