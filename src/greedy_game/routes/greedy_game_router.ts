import express from "express";
import UserStats from "../../models/userstats/userstats_model";
import UserStatsRepository from "../../repository/users/userstats_repository";
import WalletTransactionModel from "../models/wallet_transaction_model";
import WalletTransactionRepository from "../repository/wallet_transaction_repository";
import GreedyGameService from "../services/greedy_game_service";
import GreedyGameController from "../controllers/greedy_game_controller";

const router = express.Router();

const userStatsRepository = new UserStatsRepository(UserStats);
const walletTransactionRepository = new WalletTransactionRepository(WalletTransactionModel);
const greedyGameService = new GreedyGameService(userStatsRepository, walletTransactionRepository);
const controller = new GreedyGameController(greedyGameService);

router.get("/internal/wallet/:userId/balance", controller.getWalletBalance);
router.post("/internal/wallet/debit", controller.debit);
router.post("/internal/wallet/credit", controller.credit);

export default router;
