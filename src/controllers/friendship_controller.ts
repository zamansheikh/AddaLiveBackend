import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import IFriendshipService from "../services/friendships/friendship_service_interface";

class FriendshipController {
    service: IFriendshipService;

    constructor(service: IFriendshipService) {
        this.service = service;
    }

    sendFriendRequest = catchAsync(
        async (req: Request, res: Response) => {


        }
    );


    acceptFriendRequest = catchAsync(
        async (req: Request, res: Response) => {


        }
    );

    deleteFriendRequest = catchAsync(
        async (req: Request, res: Response) => {


        }
    );

    cancelFriendRequest = catchAsync(
        async (req: Request, res: Response) => {


        }
    );

    removeFromFriend = catchAsync(
        async (req: Request, res: Response) => {


        }
    );

    getSentFriendRequestList = catchAsync(
        async (req: Request, res: Response) => {


        }
    );

    getRecievedFriendRequestList = catchAsync(
        async (req: Request, res: Response) => {


        }
    );

    getMyFriendList = catchAsync(
        async (req: Request, res: Response) => {


        }
    );

    getOthersFriendList = catchAsync(
        async (req: Request, res: Response) => {


        }
    );

    getMutualFriends = catchAsync(
        async (req: Request, res: Response) => {


        }
    );


}


export default FriendshipController;