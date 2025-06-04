import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { CloudinaryFolder, SocketChannels } from "../../core/Utils/enums";
import { isVideoFile } from "../../core/Utils/helper_functions";
import { IPagination } from "../../core/Utils/query_builder";
import { uploadFileToCloudinary } from "../../core/Utils/upload_file_cloudinary";
import { IConversationDocument, IConversationModel } from "../../entities/chats/conversation_interface";
import { IMessage, IMessageDocument, IMessageModel } from "../../entities/chats/message_interface";
import { IConversationRepostiry } from "../../repository/chats/conversations/conversation_repository_interface";
import IMessageRepository, { IUpdateResult } from "../../repository/chats/messages/message_repository_interface";
import IChatService from "./chat_service_interface";
import SocketServer from "../../core/sockets/socket_server";
import mongoose from "mongoose";

export default class ChatService implements IChatService {
    msgRepo: IMessageRepository;
    converseRepo: IConversationRepostiry;

    constructor(msgRepo: IMessageRepository, converseRepo: IConversationRepostiry) {
        this.msgRepo = msgRepo;
        this.converseRepo = converseRepo;
    }

    async sendMessage(message: IMessage, file?: Express.Multer.File): Promise<IMessageDocument | null> {
        let messageBody: Record<string, any> = message;
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
            conversation = await prevConversation.save();
            if (!conversation) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to update conversation");
        } else {
            const conversation = await this.converseRepo.createConversation({ lastMessage: sendMessage.text, roomId: message.roomId, receiverId: message.recieverId, senderId: message.senderId });
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

    async updateSeenStatus(roomId: string): Promise<IUpdateResult | null> {
        return await this.msgRepo.updateSeenStatus(roomId);
    }

    async deleteMessage(messageId: string, myId: string): Promise<IMessageDocument | null> {
        const msg = await this.msgRepo.getMessageById(messageId);
        if(!msg) throw new AppError(StatusCodes.NOT_FOUND, "Message not found");
        if(msg.senderId.toString() != myId) throw new AppError(StatusCodes.BAD_REQUEST, "This is not your message");
        
        return this.msgRepo.deleteMessage(messageId);
    }

    async editMessage(myId: string, nessageId: string, message: Partial<IMessage>): Promise<IMessageDocument | null> {

        const msg = await this.msgRepo.getMessageById(nessageId);
        if (!msg) throw new AppError(StatusCodes.NOT_FOUND, "Message not found")

        if (msg.senderId.toString() != myId) throw new AppError(StatusCodes.BAD_REQUEST, "This is not your message");

        return await this.msgRepo.updateMessage(nessageId, message);
    }

    async getAllMessage(roomId: string, query: Record<string, any>, myId: string): Promise<{ pagination: IPagination; data: IMessageDocument[]; }> {
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

}