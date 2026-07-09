import express from "express";
import UserStats from "../../models/userstats/userstats_model";
import UserStatsRepository from "../../repository/users/userstats_repository";
import User from "../../models/user/user_model";
import UserRepository from "../../repository/users/user_repository";
import WalletTransactionModel from "../models/wallet_transaction_model";
import WalletTransactionRepository from "../repository/wallet_transaction_repository";
import GreedyGameService from "../services/greedy_game_service";
import GreedyGameController from "../controllers/greedy_game_controller";
import verifyGamesRequest from "../../core/middlewares/verify_games_signature";

const router = express.Router();

router.use(verifyGamesRequest);

const userStatsRepository = new UserStatsRepository(UserStats);
const walletTransactionRepository = new WalletTransactionRepository(WalletTransactionModel);
const userRepository = new UserRepository(User);
const greedyGameService = new GreedyGameService(userStatsRepository, walletTransactionRepository, userRepository);
const controller = new GreedyGameController(greedyGameService);

router.get("/internal/wallet/:userId/balance", controller.getWalletBalance);
router.post("/internal/wallet/debit", controller.debit);
router.post("/internal/wallet/credit", controller.credit);
router.get("/internal/wallet/transaction/:idempotencyKey", controller.getTransaction);
router.post("/internal/users/names", controller.getUserNames);

export default router;
