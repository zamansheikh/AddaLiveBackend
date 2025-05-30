import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import IChatService from "../services/chat/chat_service_interface";

export default class ChatController {
    service: IChatService;

    constructor(service: IChatService) {
        this.service = service;
    }

    sendMessage = catchAsync(async (req: Request, res: Response) => {


    });

    updateMessage = catchAsync(async (req: Request, res: Response) => {


    });

    editMessage = catchAsync(async (req: Request, res: Response) => {


    });

    deleteMessage = catchAsync(async (req: Request, res: Response) => {


    });

    getAllMessages = catchAsync(async (req: Request, res: Response) => {


    });

    getAllConversations = catchAsync(async (req: Request, res: Response) => {


    });

    deleteConversations = catchAsync(async (req: Request, res: Response) => {


    });


}