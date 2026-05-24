import AppError from "../../core/errors/app_errors";
import catchAsync from "../../core/Utils/catch_async";
import { validateFieldExistance } from "../../core/Utils/helper_functions";
import sendResponse from "../../core/Utils/send_response";
import { ICoinExchangeService } from "../../services/coin_exchange/coin_exchange_service";

export class CoinExchangeController {
  private coinExchangeService: ICoinExchangeService;

  constructor(coinExchangeService: ICoinExchangeService) {
    this.coinExchangeService = coinExchangeService;
  }

  createExchangeOption = catchAsync(async (req, res) => {
    const {
      diamondsRequired,
      coinsAwarded,
      bonusCoins,
      isActive,
      displayOrder,
    } = req.body;

    validateFieldExistance(diamondsRequired, "diamondsRequired");
    validateFieldExistance(coinsAwarded, "coinsAwarded");
    validateFieldExistance(displayOrder, "displayOrder");

    const newOption = await this.coinExchangeService.createExchangeOption({
      diamondsRequired,
      coinsAwarded,
      bonusCoins: bonusCoins ?? 0,
      isActive: isActive ?? true,
      displayOrder,
    });

    sendResponse(res, {
      success: true,
      statusCode: 201,
      result: newOption,
    });
  });

  getAllExchangeOptions = catchAsync(async (req, res) => {
    const options = await this.coinExchangeService.getAllExchangeOptions();
    sendResponse(res, {
      success: true,
      statusCode: 200,
      result: options,
    });
  });

  updateExchangeOption = catchAsync(async (req, res) => {
    const { id } = req.params;
    const {
      diamondsRequired,
      coinsAwarded,
      bonusCoins,
      isActive,
      displayOrder,
    } = req.body;

    validateFieldExistance(id, "id");

    if (
      diamondsRequired === undefined &&
      coinsAwarded === undefined &&
      bonusCoins === undefined &&
      isActive === undefined &&
      displayOrder === undefined
    ) {
      throw new AppError(400, "At least one field to update is required");
    }

    const updatedOption = await this.coinExchangeService.updateExchangeOption(id, {
      diamondsRequired,
      coinsAwarded,
      bonusCoins,
      isActive,
      displayOrder,
    });

    sendResponse(res, {
      success: true,
      statusCode: 200,
      result: updatedOption,
    });
  });

  deleteExchangeOption = catchAsync(async (req, res) => {
    const { id } = req.params;
    validateFieldExistance(id, "id");

    const deleted = await this.coinExchangeService.deleteExchangeOption(id);

    sendResponse(res, {
      success: true,
      statusCode: 200,
      result: deleted,
    });
  });

  exchangeDiamondsToCoins = catchAsync(async (req, res) => {
    const userId = req.user!.id;
    const { optionId, idempotencyKey } = req.body;

    validateFieldExistance(optionId, "optionId");
    validateFieldExistance(idempotencyKey, "idempotencyKey");

    const result = await this.coinExchangeService.exchangeDiamondsToCoins(
      userId,
      optionId,
      idempotencyKey
    );

    sendResponse(res, {
      success: true,
      statusCode: 200,
      result,
    });
  });

  getMyHistory = catchAsync(async (req, res) => {
    const userId = req.user!.id;
    const history = await this.coinExchangeService.getMyHistory(userId);

    sendResponse(res, {
      success: true,
      statusCode: 200,
      result: history,
    });
  });

  getAllHistory = catchAsync(async (req, res) => {
    const history = await this.coinExchangeService.getAllHistory();

    sendResponse(res, {
      success: true,
      statusCode: 200,
      result: history,
    });
  });
}

