import express from "express";
import PostRepository from "../repository/posts/post_repositiry";
import Posts from "../models/posts/post_model";
import PostsReactionRepostitory from "../repository/posts/likes/post_reaction_repository";
import PostReactions from "../models/posts/likes/posts_reaction_model";
import PostsCommentRepostitory from "../repository/posts/comments/post_commnet_repository";
import PostComment from "../models/posts/comments/post_comment_model";
import PostCommentReaction from "../models/posts/comments/likes/post_comment_reaction_model";
import PostService from "../services/posts/post_service";
import PostController from "../controllers/post_controller";
import { authenticate } from "../core/middlewares/auth_middleware";
import { upload } from "../core/middlewares/multer";
import { validateRequest } from "../core/middlewares/validate_request";
import { CreatePostDto } from "../dtos/posts/create_post_dto";
import { EditPostDto } from "../dtos/posts/edit_post_dto";
import { PostReactionDto } from "../dtos/posts/post_reaction_dto";
import { PostCommentDto } from "../dtos/posts/post_comment_dto";
import {  PostEditCommentDto } from "../dtos/posts/post_edit_comment_dto";
import { PostReactOnCommentDto } from "../dtos/posts/post_react_on_comment_dto";
import { PostReplyCommentDto } from "../dtos/posts/post_reply_comment_dto";
import User from "../models/user/user_model";
import UserRepository from "../repository/user_repository";

const router = express.Router();

const postRepository = new PostRepository(Posts);
const reactionRepository = new PostsReactionRepostitory(PostReactions);
const commentRepository = new PostsCommentRepostitory(PostComment);
const commentReactionRepository = new PostsReactionRepostitory(PostCommentReaction);
const userRepository = new UserRepository(User); 

const postService = new PostService(postRepository, reactionRepository, commentRepository, commentReactionRepository, userRepository);
const postController = new PostController(postService);


router.post("/create", authenticate(), upload.single('media'), validateRequest(CreatePostDto), postController.createPost);
router.get("/", authenticate(), postController.getAllPosts);
router.get("/:postId", authenticate(), postController.getPostDetails);
router.post("/edit", authenticate(), validateRequest(EditPostDto), postController.editPost);
router.delete("/delete/:postId", authenticate(), postController.deletePost);

router.route("/users/:userId").get(authenticate(), postController.getUserPosts);

router.get("/:postId/comments", authenticate(), postController.getAllComments);
router.post("/react", authenticate(),  validateRequest(PostReactionDto), postController.reactOnPost);
router.post("/comment", authenticate(),  validateRequest(PostCommentDto), postController.commentOnPost);
router.delete("/:postId/comment/delete/:commentId", authenticate(), postController.deleteComment);
router.put("/comment/edit", authenticate(), validateRequest(PostEditCommentDto), postController.editComment);
router.post("/comment/react", authenticate(), validateRequest(PostReactOnCommentDto), postController.reactOnComment);
router.post("/comment/reply", authenticate(), validateRequest(PostReplyCommentDto),  postController.replyToComment);
router.post("/:postId/comments", authenticate(), validateRequest(PostReplyCommentDto),  postController.getAllComments);


export default router;