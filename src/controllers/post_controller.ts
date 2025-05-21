import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import { IPostService } from "../services/posts/post_service_interface";


export default class PostController {
    PostService: IPostService;
    
    constructor(PostService: IPostService) {
        this.PostService = PostService;
    }

    createPost = catchAsync(
        async (req: Request, res: Response) => {

        }
    );

    
    getAllPosts = catchAsync(
        async (req: Request, res: Response) => {

        }
    );

    editPost = catchAsync(
        async (req: Request, res: Response) => {

        }
    );

    deletePost = catchAsync(
        async (req: Request, res: Response) => {

        }
    );

    reactOnPost = catchAsync(
        async (req: Request, res: Response) => {

        }
    );

    commentOnPost = catchAsync(
        async (req: Request, res: Response) => {

        }
    );

    deleteComment = catchAsync(
        async (req: Request, res: Response) => {

        }
    );

    editComment = catchAsync(
        async (req: Request, res: Response) => {

        }
    );

    reactOnComment = catchAsync(
        async (req: Request, res: Response) => {

        }
    );

    replyToComment = catchAsync(
        async (req: Request, res: Response) => {

        }
    );


    getAllComments = catchAsync(
        async (req: Request, res: Response) => {

        }
    );


}