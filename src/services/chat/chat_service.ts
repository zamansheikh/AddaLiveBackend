import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { CloudinaryFolder } from "../../core/Utils/enums";
import { isVideoFile } from "../../core/Utils/helper_functions";
import { IPagination } from "../../core/Utils/query_builder";
import { uploadFileToCloudinary } from "../../core/Utils/upload_file_cloudinary";
import { IConversationDocument, IConversationModel } from "../../entities/chats/conversation_interface";
import { IMessage, IMessageDocument, IMessageModel } from "../../entities/chats/message_interface";
import { IConversationRepostiry } from "../../repository/chats/conversations/conversation_repository_interface";
import IMessageRepository, { IUpdateResult } from "../../repository/chats/messages/message_repository_interface";
import IChatService from "./chat_service_interface";
import SocketServer from "../../core/sockets/socket_server";

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
            conversation = await this.converseRepo.updateConversation(message.roomId, { lastMessage: sendMessage.text });
            if (!conversation) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to update conversation");
        } else {
            const conversation = await this.converseRepo.createConversation({ lastMessage: sendMessage.text, roomId: message.roomId, receiverId: message.recieverId, senderId: message.senderId });
            if (!conversation) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to create conversation");
        }

        // to get the socket singleton instance
        const ioInstance = SocketServer.getInstance();
        if (ioInstance.isUserOnline(message.recieverId.toString())) {
            ioInstance.getIO().to(ioInstance.getSocketId(message.recieverId.toString())!).emit("newMessage", sendMessage);
            ioInstance.getIO().to(ioInstance.getSocketId(message.recieverId.toString())!).emit("newConversation", conversation);
        } else {
            //Todo: send firebase notification
        }
        return sendMessage;
    }

    async updateSeenStatus(roomId: string): Promise<IUpdateResult | null> {
        return await this.msgRepo.updateSeenStatus(roomId);
    }

    async deleteMessage(messageId: string): Promise<IMessageDocument | null> {
        return this.msgRepo.deleteMessage(messageId);
    }

    async editMessage(nessageId: string, message: Partial<IMessage>): Promise<IMessageDocument | null> {
        return await this.msgRepo.updateMessage(nessageId, message);
    }

    async getAllMessage(roomId: string, query: Record<string, any>): Promise<{ pagination: IPagination; data: IMessageDocument[]; }> {
        return await this.msgRepo.getMessages(roomId, query);

    }

    async deleteConversations(myId: string): Promise<IConversationDocument | null> {
        return null;
    }

    async getAllConversations(myId: string): Promise<{ pagination: IPagination; data: IConversationDocument[]; }> {
        return { pagination: {} as IPagination, data: [] };
    }

}