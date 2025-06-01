import { IPagination, QueryBuilder } from "../../../core/Utils/query_builder";
import { IConversation, IConversationDocument, IConversationModel } from "../../../entities/chats/conversation_interface";
import { IConversationRepostiry } from "./conversation_repository_interface";


export default class ConversationRepository implements IConversationRepostiry {
    model: IConversationModel

    constructor(model: IConversationModel) {
        this.model = model
    }

    async createConversation(conversation: IConversation): Promise<IConversationDocument | null> {
        const newConversation = new this.model(conversation);
        return (await newConversation.populate('senderId', 'email name avatar')).populate('receiverId', 'email name avatar');
    }

    async deleteConversation(roomId: string): Promise<IConversationDocument | null> {
        return null;
    }

    async getAllConversatins(myId: string, query: Record<string, any>): Promise<{ pagination: IPagination; data: IConversationDocument[]; }> {
        query["searchTerm"] = myId.toString();
        const qb = new QueryBuilder(this.model, query);
        const result = qb.find(["senderId"]).sort().populateField("senderId", "email name avatar").populateField("receiverId", "email name avatar").paginate();
        const pagination = await result.countTotal();
        const data = await result.exec();
        return { pagination, data };
    }

    async getConversationByRoomId(id: string): Promise<IConversationDocument | null> {
        return await this.model.findOne({ roomId: id });
    }

    async updateConversation(roomId: string, data: Partial<IConversation>): Promise<IConversationDocument | null> {
        return await this.model.findOneAndUpdate({ roomId }, data, { new: true }).populate('senderId', 'email name avatar').populate('receiverId', 'email name avatar');
    }


}