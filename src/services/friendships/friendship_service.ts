import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IFriendship, IFriendshipDocument } from "../../entities/friendship/friendship_model_interface";
import IFriendshipRepository from "../../repository/friendships/friendship_repository_interface";
import IFriendshipService from "./friendship_service_interface";
import { Types } from "mongoose";
import { FriendshipStatus } from "../../core/Utils/enums";


class FriendshipService implements IFriendshipService {
    friendRepo: IFriendshipRepository;

    constructor(repo: IFriendshipRepository) {
        this.friendRepo = repo;
    }

    async sendFriendRequest(body: IFriendship): Promise<IFriendshipDocument | null> {
        const prevDoc = await this.friendRepo.getRequestConditionally({ sender: body.sender, reciever: body.reciever });
        if (prevDoc && prevDoc.length > 0) {
            if(prevDoc[0].sender.toString() != body.sender.toString()) throw new AppError(StatusCodes.BAD_REQUEST, "user is not a sender to the existing document the receiver is");
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

        const accepted = await this.friendRepo.updateFriendRequsetStatus((prevDoc[0]._id as Types.ObjectId).toString(), FriendshipStatus.accepted);
        if (!accepted) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Updating status to accepted failed");

        return accepted;
    }

    async cancelFriendRequest(body: IFriendship): Promise<IFriendshipDocument | null> {
        const prevDoc = await this.friendRepo.getRequestConditionally({ sender: body.sender, reciever: body.reciever });
        if (!prevDoc || (prevDoc && prevDoc.length == 0)) throw new AppError(StatusCodes.BAD_REQUEST, "The request document does not exist");
        if(prevDoc[0].sender.toString() != body.sender.toJSON()) throw new AppError(StatusCodes.BAD_REQUEST, "this user is not the sender of the request");

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

    async getMutualFriends(user1: string, user2: string): Promise<IFriendshipDocument[] | null> {
        return null;
    }

    async myFriendLists(userId: string): Promise<IFriendshipDocument[] | null> {
        return null;
    }

    async othersFriendLists(userId: string): Promise<IFriendshipDocument[] | null> {
        return null;
    }

    async recievedRequsetLists(userId: string): Promise<IFriendshipDocument[] | null> {
        return null;
    }

    async removeFromFriend(body: IFriendship): Promise<IFriendshipDocument | null> {
        return null;
    }


    async sentRequsetLists(userId: string): Promise<IFriendshipDocument[] | null> {
        return null;
    }

}

export default FriendshipService;