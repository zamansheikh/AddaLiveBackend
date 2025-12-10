import BlockedEmailModel from "../../models/security/blocked_emails";
import { BlockedEmailRepository } from "../../repository/security/blockedEmailRepository";

export const blockedEmailRepositoryObject = new BlockedEmailRepository(BlockedEmailModel);