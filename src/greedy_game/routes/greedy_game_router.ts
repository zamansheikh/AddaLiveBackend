import express from "express";
import UserStats from "../../models/userstats/userstats_model";
import UserStatsRepository from "../../repository/users/userstats_repository";
import User from "../../models/user/user_model";
import UserRepository from "../../repository/users/user_repository";
import WalletTransactionModel from "../models/wallet_transaction_model";
import WalletTransactionRepository from "../repository/wallet_transaction_repository";
import GreedyGameService from "../services/greedy_game_service";
import GreedyGameController from "../controllers/greedy_game_controller";
import GameSessionService from "../services/game_session_service";
import GameSessionController from "../controllers/game_session_controller";
import verifyGamesRequest from "../../core/middlewares/verify_games_signature";
import internalErrorHandler from "../middlewares/internal_error_handler";
import { authenticate } from "../../core/middlewares/auth_middleware";

const userStatsRepository = new UserStatsRepository(UserStats);
const walletTransactionRepository = new WalletTransactionRepository(WalletTransactionModel);
const userRepository = new UserRepository(User);

const greedyGameService = new GreedyGameService(
  userStatsRepository,
  walletTransactionRepository,
  userRepository,
);
const controller = new GreedyGameController(greedyGameService);

const gameSessionService = new GameSessionService(userRepository);
const sessionController = new GameSessionController(gameSessionService);

/**
 * Server-to-server API the GAMES backend calls. Every route is HMAC-signed —
 * there is no user-token path in here.
 *
 * Exported separately so it can be mounted under more than one prefix: the games
 * backend's `PROVIDER_BASE_URL` may end in `/api/game` or `/api/v1`, and the
 * signature covers whichever full path it actually sends.
 */
const internalRouter = express.Router();

internalRouter.use(verifyGamesRequest);

// Registered before `/wallet/:userId/balance` — both are three segments, and an
// idempotency key must never be read as a userId.
internalRouter.get("/wallet/transaction/:idempotencyKey", controller.getTransaction);
internalRouter.get("/wallet/:userId/balance", controller.getWalletBalance);
internalRouter.post("/wallet/debit", controller.debit);
internalRouter.post("/wallet/credit", controller.credit);
internalRouter.post("/wallet/transactions/lookup", controller.lookupTransactions);
internalRouter.post("/users/names", controller.getUserNames);
internalRouter.post("/users/search", controller.searchUsers);

// Must be last: converts errors into the `{ success, error: { code } }` envelope
// the games backend reads, and — critically — keeps an unclassified failure a 5xx
// so games reconciles rather than assuming the coins never moved.
internalRouter.use(internalErrorHandler);

const router = express.Router();

// Player-facing: exchange an Adda login for a short-lived games session token.
// Declared before the internal mount so it is never gated by the HMAC guard.
router.post("/session/token", authenticate(), sessionController.mintPlayerToken);

router.use("/internal", internalRouter);

export { internalRouter };
export default router;
