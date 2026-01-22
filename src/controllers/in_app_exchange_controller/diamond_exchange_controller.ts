import AppError from "../../core/errors/app_errors";
import catchAsync from "../../core/Utils/catch_async";
import { validateFieldExistance } from "../../core/Utils/helper_functions";
import sendResponse from "../../core/Utils/send_response";
import { IDIamondExchangeService } from "../../services/in_app_exchange_service/diamondExchangeService";

export class DiamondExchangeController {
  diamondExchangeService: IDIamondExchangeService;
  constructor(diamondExchangeService: IDIamondExchangeService) {
    this.diamondExchangeService = diamondExchangeService;
  }

  createDiamondExchangeDocument = catchAsync(async (req, res) => {
    const { coinAmount, diamondCost } = req.body;
    validateFieldExistance(coinAmount, "coinAmount");
    validateFieldExistance(diamondCost, "diamondCost");
    const newDocument = await this.diamondExchangeService.createDiamondExchange(
      coinAmount,
      diamondCost,
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      result: newDocument,
    });
  });
  getDiamondExchangeDocuments = catchAsync(async (req, res) => {
    const documents = await this.diamondExchangeService.getDiamondExchange();
    sendResponse(res, {
      success: true,
      statusCode: 200,
      result: documents,
    });
  });

  deleteDiamondExchangeDocument = catchAsync(async (req, res) => {
    const { id } = req.params;
    validateFieldExistance(id, "id");
    const deleted = await this.diamondExchangeService.deleteDiamondExchange(id);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      result: deleted,
    });
  });

  updateDiamondExchangeDocument = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { coinAmount, diamondCost } = req.body;
    validateFieldExistance(id, "id");
    if (!coinAmount && !diamondCost)
      throw new AppError(400, "coinAmount or diamondCost is required");
    const updatedDocument =
      await this.diamondExchangeService.updateDiamondExhange(id, {
        coinAmount,
        diamondCost,
      });
    sendResponse(res, {
      success: true,
      statusCode: 200,
      result: updatedDocument,
    });
  });

  exchangeDiamondToCoin = catchAsync(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.id;
    validateFieldExistance(id, "id");
    const exchangedCoins =
      await this.diamondExchangeService.exchangeDiamondToCoin(id, userId);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      result: { exchangedCoins },
    });
  });
}
