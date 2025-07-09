import { Types } from "mongoose";
import { CloudinaryFolder, ReactionType } from "../../core/Utils/enums";
import { isVideoFile } from "../../core/Utils/helper_functions";
import { uploadFileToCloudinary } from "../../core/Utils/upload_file_cloudinary";
import { IStoryDocument } from "../../entities/storeis/IStories";
import { IStoryReactionRepository } from "../../repository/stories/likes/story_reaction_repository_interface";
import { IStoryRepository } from "../../repository/stories/story_repository_interface";
import { IStoryService } from "./story_service_interface";
import AppError from "../../core/errors/app_errors";
import { StatusCodes } from "http-status-codes";
import { IStoryReaction, IStoryReactionDocument } from "../../entities/storeis/story_reaction_interface";
import { IPagination } from "../../core/Utils/query_builder";
import { IUserRepository } from "../../repository/user_repository";


export default class StoryService implements IStoryService {
    StoryRepository: IStoryRepository;
    ReactionRepository: IStoryReactionRepository;
    UserRepository: IUserRepository;

    constructor(storyRepo: IStoryRepository, reactionRepo: IStoryReactionRepository, userRepo: IUserRepository) {
        this.StoryRepository = storyRepo;
        this.ReactionRepository = reactionRepo;
        this.UserRepository = userRepo;
    }

    async createStory({ id, file }: { id: string; file: Express.Multer.File; }): Promise<IStoryDocument | null> {
        const user = await this.UserRepository.findUserById(id);
        if(!user) throw new AppError(StatusCodes.BAD_REQUEST, "User does not exist");
        const mediaUrl = await uploadFileToCloudinary({ isVideo: isVideoFile(file.originalname), folder: CloudinaryFolder.userStories, file });
        if(!mediaUrl) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Uploading to cloud failed");
        return this.StoryRepository.createStory({mediaUrl, ownerId: new Types.ObjectId(id)});

    }

    async deleteStory({ userId, storyId }: { userId: string; storyId: string; }): Promise<IStoryDocument | null> {
        const story = await this.StoryRepository.getStorybyId(storyId);
        if(!story) throw new AppError(StatusCodes.BAD_REQUEST, "The story id is invalid");
        if(story.ownerId.toString() != userId) throw new AppError(StatusCodes.BAD_REQUEST, "The user is not authorized to delete the story");
        return await this.StoryRepository.deleteStory(storyId);
    }

    async getAllStory(query: Record<string, any>):Promise<{pagination: IPagination, data: IStoryDocument[]} | null> {
        return await this.StoryRepository.getAllStories(query);
    }

    async likeOnStory({ reaction_type, storyId, userId }: { reaction_type: string; userId: string; storyId: string; }): Promise<IStoryDocument | IStoryReactionDocument | null> {
        if (!Object.values(ReactionType).includes(reaction_type as ReactionType)) {
            throw new AppError(StatusCodes.BAD_REQUEST, "reaction_type is of wrong type");
        }
        const story = await this.StoryRepository.getStorybyId(storyId);
        if(!story) throw new AppError(StatusCodes.BAD_REQUEST, "The story id is invalid");

        const existingReactions = await this.ReactionRepository.findConditionally({
            reactedTo: storyId,
            reactedBy: userId,
        });

      

        // If reaction exists
        if (existingReactions && existingReactions.length > 0) {
            const existingReaction = existingReactions[0];
            const id = existingReaction._id;

            // Toggle off if same reaction type
            if (existingReaction.reactionType === reaction_type) {
                const delReaction = await this.ReactionRepository.delete(id as string);
                if (delReaction) return await this.StoryRepository.updateCount(storyId, {reactionCount: -1});

                throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Something went wrong while unliking the post");
            }

            // Update to new reaction type
            return await this.ReactionRepository.findAndUpdate(id as string, { reaction_type });
        }

        // No reaction exists — create a new one
        const newReaction = await this.ReactionRepository.create({
            reactedBy: new Types.ObjectId(userId),
            reactedTo: new Types.ObjectId(storyId),
            reactionType: reaction_type as ReactionType,
        });

        if (!newReaction) {
            throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "something went wrong while registering the reaction in the database");
        }

        const updatedReel = await this.StoryRepository.updateCount(storyId, {reactionCount: 1});

        if (!updatedReel) {
            throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "updating the reactions failed");
        }

        return updatedReel;
    }
}