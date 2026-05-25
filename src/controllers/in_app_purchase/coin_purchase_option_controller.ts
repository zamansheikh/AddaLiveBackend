import AppError from "../../core/errors/app_errors";
import catchAsync from "../../core/Utils/catch_async";
import { validateFieldExistance } from "../../core/Utils/helper_functions";
import sendResponse from "../../core/Utils/send_response";
import { ICoinPurchaseOptionService } from "../../services/in_app_purchase/coin_purchase_option_service";

export class CoinPurchaseOptionController {
  private coinPurchaseOptionService: ICoinPurchaseOptionService;

  constructor(coinPurchaseOptionService: ICoinPurchaseOptionService) {
    this.coinPurchaseOptionService = coinPurchaseOptionService;
  }

  create = catchAsync(async (req, res) => {
    const {
      productId,
      coinAmount,
      bonusCoins,
      price,
      currency,
      isActive,
      displayOrder,
    } = req.body;

    validateFieldExistance(productId, "productId");
    validateFieldExistance(coinAmount, "coinAmount");
    validateFieldExistance(price, "price");
    validateFieldExistance(displayOrder, "displayOrder");

    const newOption = await this.coinPurchaseOptionService.create({
      productId,
      coinAmount,
      bonusCoins: bonusCoins ?? 0,
      price,
      currency: currency ?? "USD",
      isActive: isActive ?? true,
      displayOrder,
    });

    sendResponse(res, {
      success: true,
      statusCode: 201,
      result: newOption,
    });
  });

  getAll = catchAsync(async (req, res) => {
    const options = await this.coinPurchaseOptionService.getAll();
    sendResponse(res, {
      success: true,
      statusCode: 200,
      result: options,
    });
  });

  update = catchAsync(async (req, res) => {
    const { id } = req.params;
    const {
      productId,
      coinAmount,
      bonusCoins,
      price,
      currency,
      isActive,
      displayOrder,
    } = req.body;

    validateFieldExistance(id, "id");

    if (
      productId === undefined &&
      coinAmount === undefined &&
      bonusCoins === undefined &&
      price === undefined &&
      currency === undefined &&
      isActive === undefined &&
      displayOrder === undefined
    ) {
      throw new AppError(400, "At least one field to update is required");
    }

    const updatedOption = await this.coinPurchaseOptionService.update(id, {
      productId,
      coinAmount,
      bonusCoins,
      price,
      currency,
      isActive,
      displayOrder,
    });

    sendResponse(res, {
      success: true,
      statusCode: 200,
      result: updatedOption,
    });
  });

  delete = catchAsync(async (req, res) => {
    const { id } = req.params;
    validateFieldExistance(id, "id");

    const deleted = await this.coinPurchaseOptionService.delete(id);

    sendResponse(res, {
      success: true,
      statusCode: 200,
      result: deleted,
    });
  });
}
