import express from "express";
import ReelsRepository from "../repository/reels/reels_repository";
import Reels from "../models/reels/reel_model";
import ReelsService from "../services/reels/reels_service";
import ReelController from "../controllers/reel_controller";
import { upload } from "../middlewares/multer";
import { authenticate } from "../middlewares/auth_middleware";
import { validateRequest } from "../middlewares/validate_request";
import { UploadReelDto } from "../dtos/reels/upload_reel_dto";
import { customValidateFileResponse } from "../middlewares/custom_validate_file_response";
import { EditReelDto } from "../dtos/reels/edit_reel_dto";
import { ReelReactionDto } from "../dtos/reels/reel_reaction_dto";
import ReelsReactionRepostitory from "../repository/reels/likes/reel_reaction_repository";
import ReelsReactions from "../models/reels/likes/reels_reaction_model";
import ReelsCommentRepostitory from "../repository/reels/comments/reel_comments_repository";
import Comments from "../models/reels/comments/reels_comment_model";
import ReelsCommentsReactions from "../models/reels/comments/likes/reels_comment_reaction_model";
import { ReelCommentDto } from "../dtos/reels/reel_comment_dto";
import { EditCommentDto } from "../dtos/reels/edit_comment_dto";
import {  ReactOnCommentDto } from "../dtos/reels/react_on_comment_dto";
import { ReplyCommentDto } from "../dtos/reels/reply_comment_dto";

const router = express.Router();

const reelRepository = new ReelsRepository(Reels);
const reactionRepository = new ReelsReactionRepostitory(ReelsReactions);
const commentRepository = new ReelsCommentRepostitory(Comments);
const commentReactionRepository = new ReelsReactionRepostitory(ReelsCommentsReactions)
const reelService = new ReelsService(reelRepository, reactionRepository, commentRepository, commentReactionRepository);
const reelsController = new ReelController(reelService);

router.post("/create", authenticate, upload.single('video'), validateRequest(UploadReelDto), customValidateFileResponse({ isvideo: true }), reelsController.createReel);
router.get("/", authenticate, reelsController.getAllReels);
router.put("/edit", authenticate,  validateRequest(EditReelDto), reelsController.editReel);
router.delete("/delete/:reelId", authenticate, reelsController.deleteReel);
router.post("/react", authenticate,  validateRequest(ReelReactionDto), reelsController.reactOnReel);
router.post("/comment", authenticate,  validateRequest(ReelCommentDto), reelsController.commentOnReel);
router.delete("/:reelId/comment/delete/:commentId", authenticate, reelsController.deleteComment);
router.put("/comment/edit", authenticate, validateRequest(EditCommentDto), reelsController.editComment);
router.post("/comment/react", authenticate, validateRequest(ReactOnCommentDto), reelsController.reactOnComment);
router.post("/comment/reply", authenticate, validateRequest(ReplyCommentDto),  reelsController.replyToComment);
router.get("/:reelId/comments", authenticate, reelsController.getAllComments);


export default router;

