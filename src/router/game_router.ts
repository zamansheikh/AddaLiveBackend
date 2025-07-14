import express from 'express'
import { authenticate } from '../core/middlewares/auth_middleware';
import GameController from '../controllers/game_controller';
import { validateRequest } from '../core/middlewares/validate_request';
import { UpdateUserStatsDto } from '../dtos/game/update_userstats_dto';
import { CreateHistoryDto } from '../dtos/game/create_history_dto';
import UserStatsRepository from '../repository/userstats/userstats_repository';
import HistoryRepository from '../repository/history/history_repository';
import GameService from '../services/game/game_service';
import UserStats from '../models/userstats/userstats_model';
import History from '../models/history/history_model';
import User from '../models/user/user_model';
import UserRepository from '../repository/user_repository';

const router = express.Router()

const statsRepository = new UserStatsRepository(UserStats);
const historyRepository = new HistoryRepository(History);
const userRepository = new UserRepository(User);
const gameService = new GameService(statsRepository, historyRepository, userRepository);
const gameController = new GameController(gameService);

// get leaderboard ranking list
router.route("/leaderboard").get(gameController.userLeaderBoardInfo);

// update user credits
router.route("/game_data/running_json/:userId").put(validateRequest(UpdateUserStatsDto), gameController.updateUserCredits);

// get user stats
router.route("/user_information/user_id/:userId").get(gameController.getUserInfo)

// create history document
router.route("/result-history/add/:userId").post(validateRequest(CreateHistoryDto), gameController.createHistory);


// get result history
router.route("/result-history/view/:userId/date/:date").get(gameController.getHistory);


// increase coins by
router.route("/increase-coins/:userId").put(gameController.increaseCoins);
// decrease coins by
router.route("/decrease-coins/:userId").put(gameController.decreaseCoins);




export default router;