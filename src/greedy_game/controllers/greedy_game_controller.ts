import catchAsync from "../../core/Utils/catch_async";
import { IGreedyGameService } from "../services/greedy_game_service";

export default class GreedyGameController {
  GreedyGameService: IGreedyGameService;

  constructor(GreedyGameService: IGreedyGameService) {
    this.GreedyGameService = GreedyGameService;
  }

  getWalletBalance = catchAsync(async (req, res) => {
    const { userId } = req.params;

    const balance = await this.GreedyGameService.getUserBalance(userId);

    res.status(200).json(balance);
  });
}
