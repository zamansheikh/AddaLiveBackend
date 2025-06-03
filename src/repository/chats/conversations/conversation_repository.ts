import mongoose from "mongoose";
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
        await newConversation.save();
        return (await newConversation.populate('senderId', 'email name avatar')).populate('receiverId', 'email name avatar');
    }

    async deleteConversation(myId: string, roomId: string): Promise<IConversationDocument | null> {
        const conversation = await this.model.findOne({ roomId });
        if (!conversation) return null;

        const userIdStr = myId.toString();

        const existingEntryIndex = conversation.deletedFor?.findIndex(entry => entry.userId.toString() === userIdStr);
        const now = new Date();
        if (existingEntryIndex !== -1) {
            // Update existing deleteAt timestamp
            conversation.deletedFor![existingEntryIndex!].deleteAt = now;
        } else {
            // Add new deletedFor entry
            conversation.deletedFor!.push({
                userId: new mongoose.Types.ObjectId(userIdStr),
                deleteAt: now,
            });
        }
        return await conversation.save();

    }

    async getAllConversatins(myId: string, query: Record<string, any>): Promise<{ pagination: IPagination; data: IConversationDocument[]; }> {
        query["searchTerm"] = myId.toString();
        const qb = new QueryBuilder(this.model, query);
        const result = qb.find({
            $and: [
                { $or: [{ senderId: myId }, { receiverId: myId }] },
                {
                    deletedFor: {
                        $not: {
                            $elemMatch: { userId: myId }
                        }
                    }
                }
            ],
        }).sort().populateField("senderId", "email name avatar").populateField("receiverId", "email name avatar").paginate();
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