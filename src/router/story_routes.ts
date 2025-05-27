import express from "express";
import StoriesRepository from "../repository/stories/stories_repository";
import Story from "../models/stories/stories_model";
import StoryReactionRepository from "../repository/stories/likes/story_reaction_repository";
import StoryReaction from "../models/stories/likes/story_reaction_model";
import StoryService from "../services/stories/stories_service";
import StoryController from "../controllers/story_controller";
import { authenticate } from "../core/middlewares/auth_middleware";
import { upload } from "../core/middlewares/multer";
import { customValidateFileResponse } from "../core/middlewares/custom_validate_file_response";
import { validateRequest } from "../core/middlewares/validate_request";
import { StoryReactionDto } from "../dtos/stories/story_react_dto";

const router = express.Router();

const storyRepo = new StoriesRepository(Story);
const storyReactionRepo = new StoryReactionRepository(StoryReaction);
const storyService = new StoryService(storyRepo, storyReactionRepo);
const storyController = new StoryController(storyService);


router.post("/create", authenticate, upload.single("media"), customValidateFileResponse({isvideo: false}), storyController.createStory);
router.delete("/delete/:storyId", authenticate, storyController.deleteStory);
router.post("/react/", authenticate, validateRequest(StoryReactionDto), storyController.reactOnStory);
router.get("/",authenticate ,storyController.getAllStories);



export default router;