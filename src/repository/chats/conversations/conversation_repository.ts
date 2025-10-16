import mongoose from "mongoose";
import { IPagination, QueryBuilder } from "../../../core/Utils/query_builder";
import {
  IConversation,
  IConversationDocument,
  IConversationModel,
} from "../../../entities/chats/conversation_interface";
import { IConversationRepostiry } from "./conversation_repository_interface";
import { DatabaseNames } from "../../../core/Utils/enums";
import { match } from "assert";

export default class ConversationRepository implements IConversationRepostiry {
  model: IConversationModel;

  constructor(model: IConversationModel) {
    this.model = model;
  }

  async createConversation(
    conversation: IConversation
  ): Promise<IConversationDocument | null> {
    const newConversation = new this.model(conversation);
    await newConversation.save();
    return (
      await newConversation.populate("senderId", "email name avatar")
    ).populate("receiverId", "email name avatar");
  }

  async deleteConversation(
    myId: string,
    roomId: string
  ): Promise<IConversationDocument | null> {
    const conversation = await this.model.findOne({ roomId });
    if (!conversation) return null;

    const userIdStr = myId.toString();

    const existingEntryIndex = conversation.deletedFor?.findIndex(
      (entry) => entry.userId.toString() == userIdStr
    );
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

  async getAllConversatins(
    myId: string,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; data: IConversationDocument[] }> {
    const qb = new QueryBuilder(this.model, query);
    const result = qb
      .aggregate([
        {
          $match: {
            $expr: {
              $and: [
                {
                  $or: [
                    { $eq: ["$senderId", new mongoose.Types.ObjectId(myId)] },
                    { $eq: ["$receiverId", new mongoose.Types.ObjectId(myId)] },
                  ],
                },
                {
                  $eq: [
                    {
                      $size: {
                        $filter: {
                          input: "$deletedFor",
                          as: "item",
                          cond: {
                            $and: [
                              { $eq: ["$$item.userId", new mongoose.Types.ObjectId(myId)] },
                              { $eq: ["$$item.isActive", true] },
                            ],
                          },
                        },
                      },
                    },
                    0,
                  ],
                },
              ],
            },
          },
        },
        {
          $lookup: {
            from: DatabaseNames.User,
            localField: "senderId",
            foreignField: "_id",
            as: "senderInfo",
          },
        },
        {
          $unwind: {
            path: "$senderInfo",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: DatabaseNames.User,
            localField: "receiverId",
            foreignField: "_id",
            as: "receiverInfo",
          },
        },
        {
          $unwind: {
            path: "$receiverInfo",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: DatabaseNames.messages,
            let: { roomId: "$roomId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$roomId", "$$roomId"] }],
                  },
                },
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
            ],
            as: "lstMsg",
          },
        },
        {
          $unwind: {
            path: "$lstMsg",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $set: {
            senderId: {
              name: "$senderInfo.name",
              id: "$senderInfo._id",
              avatar: "$senderInfo.avatar",
            },
            receiverId: {
              name: "$receiverInfo.name",
              id: "$receiverInfo._id",
              avatar: "$receiverInfo.avatar",
            },
            seenStatus: "$lstMsg.seen",
          },
        },
        {
          $project: {
            senderInfo: 0,
            receiverInfo: 0,
          },
        },
      ])
      .sort()
      .paginate();
    const pagination = await result.countTotal();
    const data = await result.exec();
    return { pagination, data };
  }

  async getConversationByRoomId(
    id: string
  ): Promise<IConversationDocument | null> {
    console.log(id);
    
    return await this.model.findOne({ roomId: id });
  }

  async updateConversation(
    roomId: string,
    data: Partial<IConversation>
  ): Promise<IConversationDocument | null> {
    return await this.model
      .findOneAndUpdate({ roomId }, data, { new: true })
      .populate("senderId", "email name avatar")
      .populate("receiverId", "email name avatar");
  }
}

//  qb.find({
//             $and: [
//                 { $or: [{ senderId: myId }, { receiverId: myId }] },
// {
//     deletedFor: {
//         $not:  { $elemMatch: { userId: myId, isActive: true }},
//     }
// },
//             ],
//         }).sort().populateField("senderId", "email name avatar").populateField("receiverId", "email name avatar").paginate();
