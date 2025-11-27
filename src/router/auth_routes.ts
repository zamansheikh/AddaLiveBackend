import express from "express";
import User from "../models/user/user_model";
import UserRepository from "../repository/users/user_repository";
import AuthService from "../services/auth/auth_services";
import AuthController from "../controllers/auth_controller";
import { RegisterUserDto } from "../dtos/auth/register_with_google_dto";
import { ProfileUpdateDto } from "../dtos/auth/profile_update_dto";
import { upload } from "../core/middlewares/multer";
import { authenticate } from "../core/middlewares/auth_middleware";
import { validateRequest } from "../core/middlewares/validate_request";
import UserStats from "../models/userstats/userstats_model";
import UserStatsRepository from "../repository/users/userstats_repository";
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
import RoomHistoryRepository from "../repository/room/room_repository";
import RoomHistory, {
  WithdrawRoomHistory,
} from "../models/room/room_history_model";
import WithdrawBonusRepository from "../repository/room/withdraw_bonus_repository";
import WithdrawBonusModel from "../models/room/withdraw_bonus_model";
import SalaryRepository from "../repository/salary/salary_repository";
import SalaryModel from "../models/salary/salaryModel";
import AgencyJoinRequestRepository from "../repository/request/AgencyJoinRequestRepository";
import AgencyJoinRequestModel from "../models/request/agencyJoinRequset";
import PortalUserRepository from "../repository/portal_user/portal_user_repository";
import PortalUser from "../models/portal_users/protal_user_model";
import MyBucketRepository from "../repository/store/my_bucket_repository";
import MyBucketModel from "../models/store/my_bucket_model";
import StoreCategoryRepository from "../repository/store/store_category_repository";
import StoreCategoryModel from "../models/store/store_category_model";
import RoomBonusRecordRepository from "../repository/room/room_bonus_records_repository";
import RoomBonusRecordsModel from "../models/room/bonus_records_model";
import { DatabaseNames, UserRoles } from "../core/Utils/enums";
import mongoose from "mongoose";

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

const roomHistoryRepository = new RoomHistoryRepository(RoomHistory);
const withdrawHistoryRepository = new RoomHistoryRepository(
  WithdrawRoomHistory
);
const bonusRepository = new WithdrawBonusRepository(WithdrawBonusModel);
const salaryRepository = new SalaryRepository(SalaryModel);
const agencyJoinRequestRepository = new AgencyJoinRequestRepository(
  AgencyJoinRequestModel
);
const bucketRepository = new MyBucketRepository(MyBucketModel);
const categoryRepository = new StoreCategoryRepository(StoreCategoryModel);

const portalUserRepository = new PortalUserRepository(PortalUser);
const roomBonousRepository = new RoomBonusRecordRepository(
  RoomBonusRecordsModel
);

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
  storyReactionRepository,
  roomHistoryRepository,
  withdrawHistoryRepository,
  bonusRepository,
  salaryRepository,
  agencyJoinRequestRepository,
  portalUserRepository,
  bucketRepository,
  categoryRepository,
  roomBonousRepository
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
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverPicture", maxCount: 1 },
  ]),
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

router
  .route("/daily-bonus")
  .post(authenticate(), authController.addDailtyBonus);
router
  .route("/withdraw-bonus")
  .post(
    authenticate([UserRoles.User, UserRoles.Host]),
    authController.withdrawBonus
  )
  .get(
    authenticate([UserRoles.User, UserRoles.Host]),
    authController.getMyBonus
  );

router.post(
  "/generate-token",
  authenticate(),
  validateRequest(GenerateTokenDto),
  authController.generateToken
);

router
  .route("/agency-join")
  .post(authenticate(), authController.agencyJoinRequest)
  .get(authenticate(), authController.agencyJoinRequestStatus)
  .delete(authenticate(), authController.agencyCancelRequest);

router
  .route("/live-count/:hostId")
  .get(authenticate(), authController.getLiveCountStatus);

router
  .route("/email-password-login")
  .post(authController.loginWithEmailPassword)
  .put(authenticate(), authController.setMyPassword);


router.route("/is-premium").get(authenticate(), authController.isPremiumUser);

// router.route("/get-user-data").get(authenticate(), async (req, res) => {
//   const data = await User.aggregate([
//     {
//       $lookup: {
//         from: DatabaseNames.RoomBonusRecord,
//         let: { userId: "$_id" },
//         pipeline: [
//           {
//             $match: {
//               $expr: {
//                 $and: [
//                   { $eq: ["$userId", "$$userId"] },
//                   { $eq: ["$readStatus", false] },
//                 ],
//               },
//             },
//           },
//           {
//             $group: {
//               _id: null,
//               totalBonus: { $sum: "$bonusDiamonds" },
//             },
//           },
//         ],
//         as: "bonus",
//       },
//     },
//     {
//       $lookup: {
//         from: DatabaseNames.userStats,
//         let: { userId: "$_id" },
//         pipeline: [
//           {
//             $match: { $expr: { $eq: ["$userId", "$$userId"] } },
//           },
//         ],
//         as: "stats",
//       },
//     },
//     {      $unwind: {
//         path: "$bonus",
//         preserveNullAndEmptyArrays: true,
//       },
//     },
//     {
//       $unwind: {
//         path: "$stats",
//         preserveNullAndEmptyArrays: true,
//       },
//     },
//     {
//       $project: {
//         name: 1,
//         email: 1,
//         uid: 1,
//         userRole: 1,
//         "bonus.totalBonus": 1,
//         "stats.diamonds": 1,
//         "stats.coins": 1,
//       },
//     },
//   ]);
//   res.send(data);
// });

export default router;
