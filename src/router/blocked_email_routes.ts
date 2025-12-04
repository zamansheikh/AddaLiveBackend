import express from "express";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";
import { BlockedEmailController } from "../controllers/blockedEmailController";
import { BlockedEmailRepository } from "../repository/security/blockedEmailRepository";
import BlockedEmailModel from "../models/security/blocked_emails";
import { validateRequest } from "../core/middlewares/validate_request";

const router = express.Router();

const repository = new BlockedEmailRepository(BlockedEmailModel);
const controller = new BlockedEmailController(repository);

router.route("/").post(controller.addEmail).get(controller.getAllEmails);

router.route("/flat").get(controller.getAllEmailsFlat);

router.route("/:id").delete(controller.deleteEmail);

export default router;
