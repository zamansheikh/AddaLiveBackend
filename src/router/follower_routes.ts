import express from "express";
import FollowerRepository from "../repository/follower/follower_repository";
import Follower from "../models/followers/followers_model";
import FollowerService from "../services/follower/follower_service";
import FollowerController from "../controllers/follower_controller";
import { authenticate } from "../core/middlewares/auth_middleware";
import UserRepository from "../repository/user_repository";
import User from "../models/user/user_model";
import FriendshipRepository from "../repository/friendships/friendship_repository";
import Friendship from "../models/friendship/friendship_model";

const router = express.Router();

const followerRepository = new FollowerRepository(Follower);
const userRepository = new UserRepository(User);
const friendShipRepository = new FriendshipRepository(Friendship);
const followerService = new FollowerService(followerRepository, userRepository, friendShipRepository);
const followerController = new FollowerController(followerService);

router.route("/follow/:userId")
    .post(authenticate(), followerController.followUser)
    .delete(authenticate(), followerController.unfollowUser);

router.route("/following-list")
    .get(authenticate(), followerController.myFollowingList);

router.route("/follower-list")
    .get(authenticate(), followerController.myFollowerList);

router.route("/friend-list")
    .get(authenticate(), followerController.myFriendList);

router.route("/follower-and-following-count")
    .get(authenticate(), followerController.getMyFollowerAndFollowingCount);

router.route("/follower-list/:userId")
    .get(authenticate(), followerController.getUserFollowerList);

router.route("/following-list/:userId")
    .get(authenticate(), followerController.getUserFollowingList);

router.route("/friend-list/:userId")
    .get(authenticate(), followerController.getUserFriendList);
    

router.route("/follower-and-following-count/:userId")
    .get(authenticate(), followerController.getFollowerAndFollowingCount);




 


export default router;