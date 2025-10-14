import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { CloudinaryFolder, SocketChannels, WhoCanTextMe, WhoCanTextMeLevelTypes } from "../../core/Utils/enums";
import { isVideoFile } from "../../core/Utils/helper_functions";
import { IPagination } from "../../core/Utils/query_builder";
import { uploadFileToCloudinary } from "../../core/Utils/upload_file_cloudinary";
import { IConversationDocument, IConversationModel } from "../../entities/chats/conversation_interface";
import { IMessage, IMessageDocument, IMessageModel } from "../../entities/chats/message_interface";
import { IConversationRepostiry } from "../../repository/chats/conversations/conversation_repository_interface";
import IMessageRepository, { IUpdateResult } from "../../repository/chats/messages/message_repository_interface";
import IChatService from "./chat_service_interface";
import SocketServer from "../../core/sockets/socket_server";
import mongoose, { Types } from "mongoose";
import { IUserRepository } from "../../repository/users/user_repository";
import { IFollowerRepository } from "../../repository/follower/follower_repository";
import { IBlockChatRepository } from "../../repository/chats/blockRepository";
import { IBlockChatDocument } from "../../models/chats/block_model";

export default class ChatService implements IChatService {
    msgRepo: IMessageRepository;
    converseRepo: IConversationRepostiry;
    userRepo: IUserRepository
    followerRepo: IFollowerRepository;
    BlockRepository: IBlockChatRepository;

    constructor(msgRepo: IMessageRepository, converseRepo: IConversationRepostiry, userRepo: IUserRepository, followerRepo: IFollowerRepository, BlockRepository: IBlockChatRepository) {
        this.msgRepo = msgRepo;
        this.converseRepo = converseRepo;
        this.userRepo = userRepo;
        this.followerRepo = followerRepo;
        this.BlockRepository = BlockRepository;
    }

    async sendMessage(message: IMessage, file?: Express.Multer.File): Promise<IMessageDocument | null> {
        let messageBody: Record<string, any> = message;
        if(message.senderId.toString() == message.recieverId.toString()) 
            throw new AppError(StatusCodes.BAD_REQUEST, "You cannot send message to yourself");
        // checking block status
        const isBlocked = await this.BlockRepository.isBlocked(message.senderId.toString(), message.recieverId.toString());
        if(isBlocked) throw new AppError(StatusCodes.BAD_REQUEST, "You are blocked by this user");
        const sender = await this.userRepo.findUserById(message.senderId.toString());
        const reciever = await this.userRepo.findUserById(message.recieverId.toString());
        if (!reciever) throw new AppError(StatusCodes.NOT_FOUND, "Reciever not found");
        if (!sender) throw new AppError(StatusCodes.NOT_FOUND, "Sender not found");
        if(reciever.whoCanTextMe == WhoCanTextMe.MyFollowers){
            const hisFollower  = await this.followerRepo.findFollower({myId: message.recieverId.toString(), followerId: message.senderId.toString()});
            if(!hisFollower) throw new AppError(StatusCodes.BAD_REQUEST, "You are not following this user, user privacy requires following the user");
        }
        if(reciever.whoCanTextMe == WhoCanTextMe.HighLevel) {
            for(let requirement of reciever.highLevelRequirements) {
                if(requirement.levelType == WhoCanTextMeLevelTypes.UserLevel) {
                    if(requirement.level > sender.level!) 
                        throw new AppError(StatusCodes.BAD_REQUEST, `User level must be at least ${requirement.level} to text this user`);
                }
            }
        }
        if (file) {
            const isVideo = isVideoFile(file.originalname);
            const mediaUrl = await uploadFileToCloudinary({ isVideo, file, folder: isVideo ? CloudinaryFolder.messageVideos : CloudinaryFolder.messageImages });
            if (!mediaUrl) throw new Error("Failed to upload media file.");
            messageBody["file"] = mediaUrl;
        }
        const sendMessage = await this.msgRepo.createMessage(messageBody as IMessage);
        if (!sendMessage) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to send message");

        const prevConversation = await this.converseRepo.getConversationByRoomId(message.roomId);

        let conversation;
        if (prevConversation) {
            if (prevConversation.deletedFor && prevConversation.deletedFor.length > 0) {
                const length = prevConversation.deletedFor.length;
                for (let i = 0; i < length; i++) {
                    prevConversation.deletedFor[i].isActive = false;
                }
            }
            prevConversation.lastMessage = sendMessage.text;
            prevConversation.seenStatus = true;
            conversation = await prevConversation.save();
            if (!conversation) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to update conversation");
        } else {
            const conversation = await this.converseRepo.createConversation({ lastMessage: sendMessage.text, roomId: message.roomId, receiverId: new Types.ObjectId( message.recieverId), senderId: new Types.ObjectId(message.senderId) });
            if (!conversation) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to create conversation");
        }

        // to get the socket singleton instance
        const ioInstance = SocketServer.getInstance();
        if (ioInstance.isUserOnline(message.recieverId.toString())) {
            ioInstance.getIO().to(ioInstance.getSocketId(message.recieverId.toString())!).emit(SocketChannels.newMessage, sendMessage);
            ioInstance.getIO().to(ioInstance.getSocketId(message.recieverId.toString())!).emit(SocketChannels.newConversation, conversation);
        } else {
            //Todo: send firebase notification
        }
        return sendMessage;
    }

    async updateSeenStatus(roomId: string, myId: string): Promise<IUpdateResult | null> {
        return await this.msgRepo.updateSeenStatus(roomId, myId);
    }

    async deleteMessage(messageId: string, myId: string): Promise<IMessageDocument | null> {
        const msg = await this.msgRepo.getMessageById(messageId);
        if (!msg) throw new AppError(StatusCodes.NOT_FOUND, "Message not found");
        if (msg.senderId.toString() != myId) throw new AppError(StatusCodes.BAD_REQUEST, "This is not your message");
        if (msg.deletedFor && msg.deletedFor.length > 0) {
            const length = msg.deletedFor.length;
            for (let i = 0; i < length; i++) {
                if (msg.deletedFor[i].userId.toString() === myId) {
                    throw new AppError(StatusCodes.BAD_REQUEST, "This message is already deleted");
                }
            }
        }
        msg.deletedFor?.push({ userId: new mongoose.Types.ObjectId(myId), deleteAt: new Date() });
        const deleted = await msg.save();
        if (!deleted) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to delete the message");
        return deleted;

    }

    async editMessage(myId: string, nessageId: string, message: Partial<IMessage>): Promise<IMessageDocument | null> {

        const msg = await this.msgRepo.getMessageById(nessageId);
        if (!msg) throw new AppError(StatusCodes.NOT_FOUND, "Message not found")

        if (msg.senderId.toString() != myId) throw new AppError(StatusCodes.BAD_REQUEST, "This is not your message");

        return await this.msgRepo.updateMessage(nessageId, message);
    }

    async getAllMessage(roomId: string, query: Record<string, any>, myId: string): Promise<{ pagination: IPagination; data: IMessageDocument[]; }> {
        query["myId"] = myId;
        const conversation = await this.converseRepo.getConversationByRoomId(roomId);
        if (!conversation) throw new AppError(StatusCodes.NOT_FOUND, "Conversation not found");
        if (conversation.deletedFor && conversation.deletedFor.length > 0) {
            const length = conversation.deletedFor.length;
            for (let i = 0; i < length; i++) {
                if (conversation.deletedFor[i].userId.toString() === myId) {
                    return await this.msgRepo.getMessages(roomId, query, conversation.deletedFor[i].deleteAt.toString());
                }
            }
        }
        return await this.msgRepo.getMessages(roomId, query);

    }

    async deleteConversations(myId: string, roomId: string): Promise<IConversationDocument | null> {

        const conversation = await this.converseRepo.getConversationByRoomId(roomId);
        if (!conversation) throw new AppError(StatusCodes.NOT_FOUND, "Conversation not found");

        const existingEntryIndex = conversation.deletedFor?.findIndex(entry => entry.userId.toString() === myId);
        const now = new Date();

        if (existingEntryIndex !== -1) {
            conversation.deletedFor![existingEntryIndex!].deleteAt = now;
            conversation.deletedFor![existingEntryIndex!].isActive = true;
        } else {
            conversation.deletedFor!.push({
                userId: new mongoose.Types.ObjectId(myId),
                deleteAt: now,
            });
        }
        const deleted = await conversation.save();

        if (!deleted) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "failed to delete the conversation");
        return deleted;

    }

    async getAllConversations(myId: string, query: Record<string, any>): Promise<{ pagination: IPagination; data: IConversationDocument[]; }> {
        const allConversations = await this.converseRepo.getAllConversatins(myId, query);
        return allConversations;
    }

    async blockUser(myId: string, recieverId: string): Promise<IBlockChatDocument> {
        const isBlocked = await this.BlockRepository.isBlocked(myId, recieverId);
        if(isBlocked) throw new AppError(StatusCodes.BAD_REQUEST, "You are already blocked by this user");
        const newBlock = await this.BlockRepository.createBlock({blockerId: myId, blockedId: recieverId});
        if(!newBlock) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to block the user");
        return newBlock;
    }

    async unblockUser(myId: string, recieverId: string): Promise<IBlockChatDocument> {
        if(myId == recieverId) throw new AppError(StatusCodes.BAD_REQUEST, "You cannot unblock yourself");
        const myBlock = await this.BlockRepository.isMyBlocked(myId, recieverId);
        const isBlocked = await this.BlockRepository.isBlocked(myId, recieverId);
        if(!myBlock && isBlocked) throw new AppError(StatusCodes.BAD_REQUEST, "You did not block this user");
        if(!myBlock && !isBlocked) throw new AppError(StatusCodes.BAD_REQUEST, "this conversation is not blocked");
        const deletedBlock = await this.BlockRepository.deleteBlock(myBlock);
        return deletedBlock;
    }

}