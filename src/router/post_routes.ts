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

const router = express.Router();

const postRepository = new PostRepository(Posts);
const reactionRepository = new PostsReactionRepostitory(PostReactions);
const commentRepository = new PostsCommentRepostitory(PostComment);
const commentReactionRepository = new PostsReactionRepostitory(PostCommentReaction);

const postService = new PostService(postRepository, reactionRepository, commentRepository, commentReactionRepository);
const postController = new PostController(postService);



export default router;