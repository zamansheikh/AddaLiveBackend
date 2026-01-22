import express from 'express';


import { DiamondExchangeRepository } from '../repository/in_app_exchange_repositories/diamondExchangeRepository';
import DiamondEchangeModel from '../models/in_app_currency_exchange_model/diamond_exchange_model';
import { DiamondExchangeService } from '../services/in_app_exchange_service/diamondExchangeService';
import { DiamondExchangeController } from '../controllers/in_app_exchange_controller/diamond_exchange_controller';
import { authenticate } from '../core/middlewares/auth_middleware';
import { UserRoles } from '../core/Utils/enums';

const router = express.Router();

const repository = new DiamondExchangeRepository(DiamondEchangeModel);
const service = new DiamondExchangeService(repository);
const controller = new DiamondExchangeController(service);

router
  .route("/")
  .post(authenticate([UserRoles.Admin]), controller.createDiamondExchangeDocument)
  .get(authenticate(), controller.getDiamondExchangeDocuments);

router
  .route("/:id")
  .put(authenticate([UserRoles.Admin]), controller.updateDiamondExchangeDocument)
  .delete(authenticate([UserRoles.Admin]), controller.deleteDiamondExchangeDocument);

router
  .route("/exchange/:id")
  .post(authenticate(), controller.exchangeDiamondToCoin);


export default router;