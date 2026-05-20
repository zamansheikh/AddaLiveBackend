import express from "express";
import { CoinExchangeService } from "../services/coin_exchange/coin_exchange_service";
import { CoinExchangeController } from "../controllers/coin_exchange/coin_exchange_controller";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";

const router = express.Router();

const service = new CoinExchangeService();
const controller = new CoinExchangeController(service);

// Exchange Option Management (Admin-only for write, authenticated users for read)
router
  .route("/")
  .post(authenticate([UserRoles.Admin]), controller.createExchangeOption)
  .get(authenticate(), controller.getAllExchangeOptions);

router
  .route("/:id")
  .put(authenticate([UserRoles.Admin]), controller.updateExchangeOption)
  .delete(authenticate([UserRoles.Admin]), controller.deleteExchangeOption);

// Coin Exchange execution (authenticated users)
router
  .route("/exchange")
  .post(authenticate(), controller.exchangeCoinsToDiamonds);

// Exchange history for the logged-in user (authenticated users)
router
  .route("/my-history")
  .get(authenticate(), controller.getMyHistory);

// Global exchange history (Admin-only)
router
  .route("/history")
  .get(authenticate([UserRoles.Admin]), controller.getAllHistory);

export default router;

