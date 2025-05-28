import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IFriendship, IFriendshipDocument } from "../../entities/friendship/friendship_model_interface";
import IFriendshipRepository from "../../repository/friendships/friendship_repository_interface";
import IFriendshipService from "./friendship_service_interface";
import { Types } from "mongoose";
import { FriendshipStatus, RequestTypes } from "../../core/Utils/enums";
import { IPagination } from "../../core/Utils/query_builder";


class FriendshipService implements IFriendshipService {
    friendRepo: IFriendshipRepository;

    constructor(repo: IFriendshipRepository) {
        this.friendRepo = repo;
    }

    async sendFriendRequest(body: IFriendship): Promise<IFriendshipDocument | null> {
        const prevDoc = await this.friendRepo.getRequestConditionally({ sender: body.sender, reciever: body.reciever });
        if (prevDoc && prevDoc.length > 0) {
            if (prevDoc[0].sender.toString() != body.sender.toString()) throw new AppError(StatusCodes.BAD_REQUEST, "user is not a sender to the existing document the receiver is");
            if (prevDoc[0].status == FriendshipStatus.rejected) throw new AppError(StatusCodes.BAD_REQUEST, "You have already been rejected");
            if (prevDoc[0].status == FriendshipStatus.accepted) throw new AppError(StatusCodes.BAD_REQUEST, "you are already friends");
            return prevDoc[0];
        }
        const newRequest = await this.friendRepo.createFriendRequest(body);
        if (!newRequest) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Error Creating send request records");

        // TODO: send the reciever a notificaiton saying he has recieved a friend request. 

        return newRequest;
    }

    async acceptFriendRequest(body: { myId: Types.ObjectId, userId: Types.ObjectId }): Promise<IFriendshipDocument | null> {

        const prevDoc = await this.friendRepo.getRequestConditionally({ sender: body.myId, reciever: body.userId });

        if (prevDoc && prevDoc.length == 0) throw new AppError(StatusCodes.BAD_REQUEST, "No document found");
        if (prevDoc[0].reciever.toString() != body.myId.toString()) throw new AppError(StatusCodes.BAD_REQUEST, "this user is not the reciever of the request");
        if (prevDoc[0].status == FriendshipStatus.rejected) throw new AppError(StatusCodes.BAD_REQUEST, "The request has already been rejected");

        const accepted = await this.friendRepo.updateFriendRequsetStatus((prevDoc[0]._id as Types.ObjectId).toString(), FriendshipStatus.accepted);
        if (!accepted) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Updating status to accepted failed");

        // TODO: send the reciever a notificaiton saying his friend request has been accepted

        return accepted;
    }

    async cancelFriendRequest(body: IFriendship): Promise<IFriendshipDocument | null> {
        const prevDoc = await this.friendRepo.getRequestConditionally({ sender: body.sender, reciever: body.reciever });
        if (!prevDoc || (prevDoc && prevDoc.length == 0)) throw new AppError(StatusCodes.BAD_REQUEST, "The request document does not exist");
        if (prevDoc[0].sender.toString() != body.sender.toJSON()) throw new AppError(StatusCodes.BAD_REQUEST, "this user is not the sender of the request");

        const cancelledReq = await this.friendRepo.deleteFriendship(prevDoc[0]._id as string);
        if (!cancelledReq) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "removing the document from db failed");

        return cancelledReq;
    }

    async deleteFriendRequest(body: { myId: Types.ObjectId, userId: Types.ObjectId }): Promise<IFriendshipDocument | null> {
        const prevDoc = await this.friendRepo.getRequestConditionally({ sender: body.myId, reciever: body.userId });

        if (prevDoc && prevDoc.length == 0) throw new AppError(StatusCodes.BAD_REQUEST, "No document found");
        if (prevDoc[0].reciever.toString() != body.myId.toString()) throw new AppError(StatusCodes.BAD_REQUEST, "this user is not the reciever of the request");

        const rejected = await this.friendRepo.updateFriendRequsetStatus((prevDoc[0]._id as Types.ObjectId).toString(), FriendshipStatus.rejected);
        if (!rejected) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Updating status to rejected failed");

        return rejected;
    }

    async getMutualFriends(user1: string, user2: string, query: Record<string, any>): Promise<{pagination: IPagination, data: IFriendshipDocument[]} | null> {
        const mutualFriends = await this.friendRepo.getMutalFriends(user1, user2, query);
        return mutualFriends;
    }

    async myFriendLists(userId: string, query: Record<string, any>): Promise<{pagination: IPagination, data: IFriendshipDocument[]} | null> {
        return await this.friendRepo.getFriendList(userId, query);
    }

    async othersFriendLists(userId: string, query: Record<string, any>): Promise<{pagination: IPagination, data: IFriendshipDocument[]} | null> {
        return await this.friendRepo.getFriendList(userId, query);
    }

    async recievedRequsetLists(userId: string, query: Record<string, any>): Promise<{pagination: IPagination, data: IFriendshipDocument[]} | null> {
        return await this.friendRepo.getRequestLists(userId, RequestTypes.recieved, query);
    }

    async removeFromFriend(body: { myId: Types.ObjectId, userId: Types.ObjectId }): Promise<IFriendshipDocument | null> {
        const prevDoc = await this.friendRepo.getRequestConditionally({ sender: body.myId, reciever: body.userId });
        if (prevDoc && prevDoc.length == 0) throw new AppError(StatusCodes.BAD_REQUEST, "No document found");
        if (prevDoc[0].status == FriendshipStatus.rejected || prevDoc[0].status == FriendshipStatus.pending) throw new AppError(StatusCodes.BAD_REQUEST, "These users are not friends yet");
        const unfriend = await this.friendRepo.deleteFriendship((prevDoc[0]._id as Types.ObjectId).toString());
        if (!unfriend) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Unfriending failed");
        return unfriend;
    }


    async sentRequsetLists(userId: string, query: Record<string, any>): Promise<{pagination: IPagination, data: IFriendshipDocument[]} | null> {
        return await this.friendRepo.getRequestLists(userId, RequestTypes.sent, query);
    }

}

export default FriendshipService;