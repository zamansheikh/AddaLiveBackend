import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import { IPostService } from "../services/posts/post_service_interface";
import { sendResponseEnhanced } from "../core/Utils/send_response";


export default class PostController {
    PostService: IPostService;

    constructor(PostService: IPostService) {
        this.PostService = PostService;
    }

    createPost = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const { postCaption } = req.body;

            const post = await this.PostService.createPost({ ownerId: id, body: req.body, file: req.file });
            sendResponseEnhanced(res, post);
        }
    );


    getAllPosts = catchAsync(
        async (req: Request, res: Response) => {
            let query = req.query;
            query["userId"] = req.user!.id;
            const allPosts = await this.PostService.getAllPost(query);
            sendResponseEnhanced(res, allPosts);
        }
    );

    getPostDetails = catchAsync(
        async (req: Request, res: Response) => {
            const { postId } = req.params;
            const { id } = req.user!;
            const postDetails = await this.PostService.getPostDetails(postId, id);
            sendResponseEnhanced(res, postDetails);
        }
    );

    editPost = catchAsync(
        async (req: Request, res: Response) => {
            const { postId, postCaption } = req.body;
            const { id } = req.user!;
            const editedPost = await this.PostService.editPost({ postCaption, userId: id, postID: postId });
            sendResponseEnhanced(res, editedPost);
        }
    );

    deletePost = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const { postId } = req.params;
            const deletedPost = await this.PostService.deletePost({ postID: postId, userId: id });
            sendResponseEnhanced(res, deletedPost);
        }
    );

    getUserPosts = catchAsync(
        async (req: Request, res: Response) => {
            const { userId } = req.params;
            const allPosts = await this.PostService.getUserPosts(userId, req.query);
            sendResponseEnhanced(res, allPosts);
        }
    );

    reactOnPost = catchAsync(
        async (req: Request, res: Response) => {
            const { reaction_type, postId } = req.body;
            const { id } = req.user!
            const post = await this.PostService.reactOnPosts({ reaction_type, postId, userID: id });
            sendResponseEnhanced(res, post);
        }
    );

    commentOnPost = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const { postId, commentText } = req.body;
            const reel = await this.PostService.commnetOnPosts({ commentText, postId, userID: id });
            sendResponseEnhanced(res, reel);
        }
    );

    deleteComment = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const { postId, commentId } = req.params;
            const reel = await this.PostService.deleteComment({ commentId, postId, userId: id });
            sendResponseEnhanced(res, reel);
        }
    );

    editComment = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const { commentId, newCommentText } = req.body;
            const reel = await this.PostService.editComment({ commentId, newComment: newCommentText, userId: id });
            sendResponseEnhanced(res, reel);
        }
    );

    reactOnComment = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const { commentId, reaction_type } = req.body;
            const comment = await this.PostService.reactOnComment({ commentId, reaction_type, userId: id });
            sendResponseEnhanced(res, comment);
        }
    );

    replyToComment = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const { commentText, commentId, postId } = req.body;
            const comment = await this.PostService.replyToComment({ commentId, commentText, userId: id, postId });
            sendResponseEnhanced(res, comment);
        }
    );


    getAllComments = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const { postId } = req.params;
            const comments = await this.PostService.getAllComments({ postId, userId: id, query: req.query });
            sendResponseEnhanced(res, comments);
        }
    );


}