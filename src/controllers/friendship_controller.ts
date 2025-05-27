import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import IFriendshipService from "../services/friendships/friendship_service_interface";
import { Types } from "mongoose";
import { sendResponseEnhanced } from "../core/Utils/send_response";

class FriendshipController {
    service: IFriendshipService;

    constructor(service: IFriendshipService) {
        this.service = service;
    }

    sendFriendRequest = catchAsync(
        async (req: Request, res: Response) => {
            const { recieverId } = req.body;
            const { id } = req.user!;
            const friendship = await this.service.sendFriendRequest({ reciever: new Types.ObjectId(recieverId as string), sender: new Types.ObjectId(id) });
            sendResponseEnhanced(res, friendship);
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
            const { recieverId } = req.params;
            const { id } = req.user!;
            const cancelRequest = await this.service.cancelFriendRequest({ reciever: new Types.ObjectId(recieverId), sender: new Types.ObjectId(id) });
            sendResponseEnhanced(res, cancelRequest);
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