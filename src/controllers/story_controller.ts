import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import { IStoryService } from "../services/stories/story_service_repository";
import { sendResponseEnhanced } from "../core/Utils/send_response";

export default class StoryController {
    StoryService: IStoryService;
    constructor(storyService: IStoryService) {
        this.StoryService = storyService;
    }

    createStory = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const story = await this.StoryService.createStory({ id, file: req.file! });
            sendResponseEnhanced(res, story);
        }
    );


    deleteStory = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const { storyId } = req.params;
            const story = await this.StoryService.deleteStory({ storyId, userId: id });
            sendResponseEnhanced(res, story);
        }
    );


    reactOnStory = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const { storyId, reaction_type } = req.body;
            const story = await this.StoryService.likeOnStory({ storyId, userId: id, reaction_type });
            sendResponseEnhanced(res, story);
        }
    );


    getAllStories = catchAsync(
        async (req: Request, res: Response) => {
            const story = await this.StoryService.getAllStory(req.query);
            sendResponseEnhanced(res, story);
        }
    );
}