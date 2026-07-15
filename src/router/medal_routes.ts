import express from "express";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";
import { upload } from "../core/middlewares/multer";
import MedalModel from "../models/medal/medal_model";
import MedalRepository from "../repository/medal/medal_repository";
import MedalService from "../services/medal/medal_service";
import MedalController from "../controllers/medal/medal_controller";

const router = express.Router();

const medalRepository = new MedalRepository(MedalModel);
const medalService = new MedalService(medalRepository);
const medalController = new MedalController(medalService);

router
  .route("/")
  .post(
    authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
    upload.single("icon"),
    medalController.createMedal,
  )
  .get(authenticate(), medalController.getAllMedals);

router.get(
  "/status",
  authenticate(),
  medalController.getMedalsWithUserStatus,
);

router
  .route("/:id")
  .get(authenticate(), medalController.getMedalById)
  .put(
    authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
    upload.single("icon"),
    medalController.updateMedal,
  )
  .delete(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), medalController.deleteMedal);

router.post(
  "/retroactive",
  authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
  medalController.retroactiveAward,
);

export default router;
