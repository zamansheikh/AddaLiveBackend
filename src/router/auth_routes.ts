import express from "express";
import User from "../models/user/user_model";
import UserRepository from "../repository/user_repository";
import AuthService from "../services/auth/auth_services";
import AuthController from "../controllers/auth_controller";
import { RegisterUserDto } from "../dtos/auth/register_with_google_dto";
import { ProfileUpdateDto } from "../dtos/auth/profile_update_dto";
import { upload } from "../core/middlewares/multer";
import { authenticate } from "../core/middlewares/auth_middleware";
import { validateRequest } from "../core/middlewares/validate_request";
import UserStats from "../models/userstats/userstats_model";
import UserStatsRepository from "../repository/userstats/userstats_repository";
import { GiftUserDto } from "../dtos/auth/gift_user_dto";
import { validate } from "class-validator";
import { GenerateTokenDto } from "../dtos/auth/generate_token_dto";
import { GiftRepository } from "../repository/gifts/gifts_repositories";
import Gifts from "../models/gifts/gifts_model";
import PostRepository from "../repository/posts/post_repositiry";
import Posts from "../models/posts/post_model";
import PostsReactionRepostitory from "../repository/posts/likes/post_reaction_repository";
import PostReactions from "../models/posts/likes/posts_reaction_model";
import PostComment from "../models/posts/comments/post_comment_model";
import PostsCommentRepostitory from "../repository/posts/comments/post_commnet_repository";
import Reels from "../models/reels/reel_model";
import ReelsRepository from "../repository/reels/reels_repository";
import ReelsReactionRepostitory from "../repository/reels/likes/reel_reaction_repository";
import ReelsReactions from "../models/reels/likes/reels_reaction_model";
import ReelsCommentRepostitory from "../repository/reels/comments/reel_comments_repository";
import Comments from "../models/reels/comments/reels_comment_model";
import StoriesRepository from "../repository/stories/stories_repository";
import Story from "../models/stories/stories_model";
import StoryReactionRepository from "../repository/stories/likes/story_reaction_repository";
import StoryReaction from "../models/stories/likes/story_reaction_model";

const router = express.Router();

const userRepository = new UserRepository(User);
const userstatsRepository = new UserStatsRepository(UserStats);
const giftRepository = new GiftRepository(Gifts);
const postRepository = new PostRepository(Posts);
const postReactionRepository = new PostsReactionRepostitory(PostReactions);
const postCommentRepository = new PostsCommentRepostitory(PostComment);

const reelRepository = new ReelsRepository(Reels);
const reelReactionRepository = new ReelsReactionRepostitory(ReelsReactions);
const reelCommentRepository = new ReelsCommentRepostitory(Comments);

const storyRepository = new StoriesRepository(Story);
const storyReactionRepository = new StoryReactionRepository(StoryReaction);

const authService = new AuthService(
  userRepository,
  userstatsRepository,
  giftRepository,
  postRepository,
  postReactionRepository,
  postCommentRepository,
  reelRepository,
  reelReactionRepository,
  reelCommentRepository,
  storyRepository,
  storyReactionRepository
);
const authController = new AuthController(authService);

router.post(
  "/register-google",
  validateRequest(RegisterUserDto),
  authController.registerWithGoogle
);
router.put(
  "/update-profile",
  authenticate(),
  upload.single("avatar"),
  validateRequest(ProfileUpdateDto),
  authController.updateProfile
);
router.get("/user/:id", authenticate(), authController.getUserDetails);
router
  .route("/my-profile")
  .get(authenticate(), authController.getMyDetails)
  .delete(authenticate(), authController.deleteMyAccount);
  
router.put(
  "/user/gift",
  authenticate(),
  validateRequest(GiftUserDto),
  authController.giftUser
);

router
  .route("/user/set-privacy/chats")
  .put(authenticate(), authController.setChatPrivacy);

router.post(
  "/generate-token",
  authenticate(),
  validateRequest(GenerateTokenDto),
  authController.generateToken
);

export default router;
