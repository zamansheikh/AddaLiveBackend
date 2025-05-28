import express from 'express';
import FriendshipRepository from '../repository/friendships/friendship_repository';
import Friendship from '../models/friendship/friendship_model';
import FriendshipService from '../services/friendships/friendship_service';
import FriendshipController from '../controllers/friendship_controller';
import { authenticate } from '../core/middlewares/auth_middleware';
import { validateRequest } from '../core/middlewares/validate_request';
import { FriendRequestDto } from '../dtos/friendship/friend_request_dto';

const router = express.Router();

const friendRepository = new FriendshipRepository(Friendship);
const friendService = new FriendshipService(friendRepository);
const friendController = new FriendshipController(friendService);


router.post("/send-request", authenticate, validateRequest(FriendRequestDto), friendController.sendFriendRequest);
router.delete("/cancel-request/:recieverId", authenticate, friendController.cancelFriendRequest);
router.put("/accept-request", authenticate, validateRequest(FriendRequestDto), friendController.acceptFriendRequest);
router.put("/delete-request/", authenticate,  validateRequest(FriendRequestDto),  friendController.deleteFriendRequest);

router.delete("/remove-friend/:userId", authenticate, friendController.removeFromFriend);

router.get("/all-sent-requests", authenticate, friendController.getSentFriendRequestList);
router.get("/all-recieved-requests", authenticate, friendController.getRecievedFriendRequestList);

router.get("/get-my-friends", authenticate, friendController.getMyFriendList)
router.get("/get-friends/:userId", authenticate, friendController.getOthersFriendList);






export default router;