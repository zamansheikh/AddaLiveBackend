import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import { IFollowerService } from "../services/follower/follower_service";
import { sendResponseEnhanced } from "../core/Utils/send_response";

export default class FollowerController {
    Service: IFollowerService
    constructor(service: IFollowerService) {
        this.Service = service;
    }

    followUser = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const { userId } = req.params;
            const followUser = await this.Service.createFollower({ myId: userId, followerId: id });
            sendResponseEnhanced(res, followUser);
        }
    );

    unfollowUser = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const { userId } = req.params;
            const unfollowUser = await this.Service.deleteFollower({ myId: userId, followerId: id });
            sendResponseEnhanced(res, unfollowUser);
        }
    );

    myFollowingList = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const followingList = await this.Service.followingList(id, req.query as Record<string, any>);
            sendResponseEnhanced(res, followingList);
        }
    );

    myFollowerList = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const followerList = await this.Service.followerList(id, req.query as Record<string, any>);
            sendResponseEnhanced(res, followerList);
        }
    );


    myFriendList = catchAsync(
        async (req: Request, res: Response) => {
            const { id } = req.user!;
            const friendList = await this.Service.friendList(id, req.query as Record<string, any>);
            sendResponseEnhanced(res, friendList);
        }
    );
    

    getFollowerAndFollowingCount = catchAsync(
        async (req: Request, res: Response) => {
            const { userId } = req.params;
            const counts = await this.Service.getFollowerAndFollowingCount(userId);
            sendResponseEnhanced(res, counts);
        }
    );



}