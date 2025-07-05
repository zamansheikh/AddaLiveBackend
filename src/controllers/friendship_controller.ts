// import { Request, Response } from "express";
// import catchAsync from "../core/Utils/catch_async";
// import IFriendshipService from "../services/friendships/friendship_service_interface";
// import { Types } from "mongoose";
// import { sendResponseEnhanced } from "../core/Utils/send_response";

// class FriendshipController {
//     service: IFriendshipService;

//     constructor(service: IFriendshipService) {
//         this.service = service;
//     }

//     sendFriendRequest = catchAsync(
//         async (req: Request, res: Response) => {
//             const { userId } = req.body;
//             const { id } = req.user!;
//             const friendship = await this.service.sendFriendRequest({ reciever: new Types.ObjectId(userId as string), sender: new Types.ObjectId(id) });
//             sendResponseEnhanced(res, friendship);
//         }
//     );


//     acceptFriendRequest = catchAsync(
//         async (req: Request, res: Response) => {
//             const { userId } = req.body;
//             const { id } = req.user!;
//             const acceptedRequest = await this.service.acceptFriendRequest({ userId: new Types.ObjectId(userId), myId: new Types.ObjectId(id) });
//             sendResponseEnhanced(res, acceptedRequest);
//         }
//     );

//     deleteFriendRequest = catchAsync(
//         async (req: Request, res: Response) => {
//             const { userId } = req.body;
//             const { id } = req.user!;
//             const acceptedRequest = await this.service.deleteFriendRequest({ userId: new Types.ObjectId(userId), myId: new Types.ObjectId(id) });
//             sendResponseEnhanced(res, acceptedRequest);
//         }
//     );

//     cancelFriendRequest = catchAsync(
//         async (req: Request, res: Response) => {
//             const { recieverId } = req.params;
//             const { id } = req.user!;
//             const cancelRequest = await this.service.cancelFriendRequest({ reciever: new Types.ObjectId(recieverId), sender: new Types.ObjectId(id) });
//             sendResponseEnhanced(res, cancelRequest);
//         }
//     );

//     removeFromFriend = catchAsync(
//         async (req: Request, res: Response) => {
//             const { userId } = req.params;
//             const { id } = req.user!;
//             const unfriend = await this.service.removeFromFriend({ userId: new Types.ObjectId(userId), myId: new Types.ObjectId(id) });
//             sendResponseEnhanced(res, unfriend);
//         }
//     );

//     getSentFriendRequestList = catchAsync(
//         async (req: Request, res: Response) => {
//             const { id } = req.user!;
//             const query = req.query;
//             const allSentRequest = await this.service.sentRequsetLists(id, query);
//             sendResponseEnhanced(res, allSentRequest);
//         }
//     );

//     getRecievedFriendRequestList = catchAsync(
//         async (req: Request, res: Response) => {
//             const { id } = req.user!;
//             const query = req.query;
//             const allSentRequest = await this.service.recievedRequsetLists(id, query);
//             sendResponseEnhanced(res, allSentRequest);
//         }
//     );

//     getMyFriendList = catchAsync(
//         async (req: Request, res: Response) => {
//             const { id } = req.user!;
//             const query = req.query;
//             const myFriends = await this.service.myFriendLists(id, query);
//             sendResponseEnhanced(res, myFriends);

//         }
//     );

//     getOthersFriendList = catchAsync(
//         async (req: Request, res: Response) => {
//             const { userId } = req.params!;
//             const query = req.query;
//             const myFriends = await this.service.othersFriendLists(userId, query);
//             sendResponseEnhanced(res, myFriends);

//         }
//     );

//     getMutualFriends = catchAsync(
//         async (req: Request, res: Response) => {
//             const { id } = req.user!;
//             const { userId } = req.params;
//             const query = req.query;
//             const mutualFriends = await this.service.getMutualFriends(id, userId, query);
//             sendResponseEnhanced(res, mutualFriends);
//         }
//     );


// }


// export default FriendshipController;