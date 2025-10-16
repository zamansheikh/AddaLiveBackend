import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import IChatService from "../services/chat/chat_service_interface";
import { sendResponseEnhanced } from "../core/Utils/send_response";
import { Types } from "mongoose";

export default class ChatController {
    service: IChatService;

    constructor(service: IChatService) {
        this.service = service;
    }

    sendMessage = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.user!
        const { reciever, text } = req.body;
        const roomId = [id, reciever].sort().join("-");
        const file = req.file;
        const sendMessage = await this.service.sendMessage({ senderId: new Types.ObjectId(id), recieverId: new Types.ObjectId(reciever), roomId, text }, file);
        sendResponseEnhanced(res, sendMessage);
    });

    updateSeenStatus = catchAsync(async (req: Request, res: Response) => {
        const { sender, reciever } = req.body;
        const {id} = req.user!;
        const roomId = [sender, reciever].sort().join("-");
        const updated = await this.service.updateSeenStatus(roomId, id);
        sendResponseEnhanced(res, updated);
    });

    editMessage = catchAsync(async (req: Request, res: Response) => {
        const { messageId } = req.params;
        const { newText } = req.body;
        const { id } = req.user!;
        const edited = await this.service.editMessage(id, messageId, { text: newText });
        sendResponseEnhanced(res, edited);

    });

    deleteMessage = catchAsync(async (req: Request, res: Response) => {
        const { messageId } = req.params;
        const { id } = req.user!;
        const deleted = await this.service.deleteMessage(messageId, id);
        sendResponseEnhanced(res, deleted);
    });

    getAllMessages = catchAsync(async (req: Request, res: Response) => {
        const { roomId } = req.params;
        const { id } = req.user!;
        const query = req.query;
        const messages = await this.service.getAllMessage(roomId, query, id);
        sendResponseEnhanced(res, messages);
    });

    getAllConversations = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.user!;
        const conversations = await this.service.getAllConversations(id, req.query);
        sendResponseEnhanced(res, conversations);
    });

    deleteConversations = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.user!;
        const { conversationId } = req.params;
        const deleted = await this.service.deleteConversations(id, conversationId);
        sendResponseEnhanced(res, deleted);
    });

    blockUser = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.user!;
        const { recieverId } = req.params;
        const blocked = await this.service.blockUser(id, recieverId);
        sendResponseEnhanced(res, blocked);
    });

    unblockUser = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.user!;
        const { recieverId } = req.params;
        const unblocked = await this.service.unblockUser(id, recieverId);
        sendResponseEnhanced(res, unblocked);
    });

    blockStatus = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.user!;
        const { recieverId } = req.params;
        const status = await this.service.getBlockStatus(id, recieverId);
        sendResponseEnhanced(res, { isBlocked: status });
    });
    
}