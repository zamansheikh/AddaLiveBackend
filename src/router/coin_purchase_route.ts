import express from "express";
import { CoinPurchaseOptionService } from "../services/in_app_purchase/coin_purchase_option_service";
import { CoinPurchaseOptionController } from "../controllers/in_app_purchase/coin_purchase_option_controller";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";

const router = express.Router();

const service = new CoinPurchaseOptionService();
const controller = new CoinPurchaseOptionController(service);

router
  .route("/")
  .post(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), controller.create)
  .get(authenticate(), controller.getAll);

router
  .route("/:id")
  .put(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), controller.update)
  .delete(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), controller.delete);

export default router;
