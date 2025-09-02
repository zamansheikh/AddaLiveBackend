import express from "express";
import { authenticate } from "../core/middlewares/auth_middleware";
import AppVersionRepository from "../repository/versions/AppVersionRepository";
import AppVersionModel from "../models/versions/appVersionModel";
import AppVersionService from "../services/versions/AppVersionServices";
import AppVersionController from "../controllers/AppVersionController";

const router = express.Router();

const repository = new AppVersionRepository(AppVersionModel);
const service = new AppVersionService(repository);
const controller = new AppVersionController(service);
router
  .route("/latest")
  .post(controller.createVersion)
  .get(controller.getVersion)
  .put(controller.updateVersion);

export default router;
