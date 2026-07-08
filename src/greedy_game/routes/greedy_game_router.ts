import express from "express";
import UserStats from "../../models/userstats/userstats_model";
import UserStatsRepository from "../../repository/users/userstats_repository";
import GreedyGameService from "../services/greedy_game_service";
import GreedyGameController from "../controllers/greedy_game_controller";

const router = express.Router();

const userStatsRepository = new UserStatsRepository(UserStats);
const greedyGameService = new GreedyGameService(userStatsRepository);
const controller = new GreedyGameController(greedyGameService);

router.get("/internal/wallet/:userId/balance", controller.getWalletBalance);

export default router;
