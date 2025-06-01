import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import IChatService from "../services/chat/chat_service_interface";
import { sendResponseEnhanced } from "../core/Utils/send_response";

export default class ChatController {
    service: IChatService;

    constructor(service: IChatService) {
        this.service = service;
    }

    sendMessage = catchAsync(async (req: Request, res: Response) => {
        const { sender, reciever, text } = req.body;
        const roomId = [sender, reciever].sort().join("-");
        const file = req.file;
        const sendMessage = await this.service.sendMessage({ senderId: sender, recieverId: reciever, text, roomId }, file);
        sendResponseEnhanced(res, sendMessage);
    });

    updateSeenStatus = catchAsync(async (req: Request, res: Response) => {
        const { sender, reciever } = req.body;
        const roomId = [sender, reciever].sort().join("-");
        const updated = await this.service.updateSeenStatus(roomId);
        sendResponseEnhanced(res, updated);
    });

    editMessage = catchAsync(async (req: Request, res: Response) => {
        const { messageId } = req.params;
        const { newText } = req.body;
        const edited = await this.service.editMessage(messageId, { text: newText });
        sendResponseEnhanced(res, edited);

    });

    deleteMessage = catchAsync(async (req: Request, res: Response) => {
        const { messageId } = req.params;
        const deleted = await this.service.deleteMessage(messageId);
        sendResponseEnhanced(res, deleted);
    });

    getAllMessages = catchAsync(async (req: Request, res: Response) => {
        const { recieverId } = req.params;
        const { id } = req.user!;
        const roomId = [ recieverId, id].sort().join("-");
        const query = req.query;
        const messages = await this.service.getAllMessage(roomId, query);
        sendResponseEnhanced(res, messages);
    });

    getAllConversations = catchAsync(async (req: Request, res: Response) => {


    });

    deleteConversations = catchAsync(async (req: Request, res: Response) => {


    });


}