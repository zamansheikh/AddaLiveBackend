import { StatusCodes } from "http-status-codes";
import AppError from "../core/errors/app_errors";
import catchAsync from "../core/Utils/catch_async"
import { sendResponseEnhanced } from "../core/Utils/send_response";
import { IGameService } from "../services/game/game_service";

export default class GameController {

    Service: IGameService
    constructor(service: IGameService) {
        this.Service = service;
    }

    userLeaderBoardInfo = catchAsync(
        async (req, res) => {
            const leaderboard = await this.Service.getUserLeaderBoardInfo(req.query as Record<string, string>);
            res.send({
                success: true,
                statusCode: 200,
                status: "success",
                user_details: leaderboard
            })
        }
    );


    updateUserCredits = catchAsync(
        async (req, res) => {
            const { userId } = req.params;
            const { total_gold, total_diamond } = req.body
            const updatedStats = await this.Service.updateUserCredits(userId, total_gold, total_diamond);
            sendResponseEnhanced(res, updatedStats);
        }
    );

    createHistory = catchAsync(
        async (req, res) => {
            const { userId } = req.params;
            const { gold, diamond, total_amount } = req.body
            const newHistory = await this.Service.createHistory({ userId, gold, diamond, totalAmount: total_amount });
            sendResponseEnhanced(res, newHistory);
        }
    );

    getHistory = catchAsync(
        async (req, res) => {
            const { userId, date } = req.params;
            const history = await this.Service.getHistory(userId, date);
            res.send(history);
        }
    );

    getUserInfo = catchAsync(
        async (req, res) => {
            const { userId } = req.params;
            const user = await this.Service.getUserInfo(userId);
            res.send({
                success: true,
                statusCode: 200,
                status: "active",
                user_details: user
            });
        }
    );

    increaseCoins = catchAsync(
        async (req, res) => {
            const { userId } = req.params;
            const { gold, diamond } = req.body;
            if (!diamond) throw new AppError(StatusCodes.BAD_REQUEST, "diamond is required");
            if (diamond < 0) throw new AppError(StatusCodes.BAD_REQUEST, "diamond cannot be negative")
            const updatedStats = await this.Service.incrementUserCredits(userId, gold, diamond); // adding coins
            res.send(updatedStats);
        }
    );

    decreaseCoins = catchAsync(
        async (req, res) => {
            const { userId } = req.params;
            const { gold, diamond } = req.body;
            if (!diamond) throw new AppError(StatusCodes.BAD_REQUEST, "diamond is required");
            if (diamond < 0) throw new AppError(StatusCodes.BAD_REQUEST, "diamond cannot be negative")
            const updatedStats = await this.Service.incrementUserCredits(userId, -gold, -diamond); // Subtracting coins
            res.send(updatedStats);
        }
    );


}