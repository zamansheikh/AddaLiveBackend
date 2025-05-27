import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IFriendship, IFriendshipDocument } from "../../entities/friendship/friendship_model_interface";
import IFriendshipRepository from "../../repository/friendships/friendship_repository_interface";
import IFriendshipService from "./friendship_service_interface";


class FriendshipService implements IFriendshipService {
    friendRepo: IFriendshipRepository;
    
    constructor(repo: IFriendshipRepository){
        this.friendRepo = repo;
    }
    
    async sendFriendRequest(body: IFriendship): Promise<IFriendshipDocument | null> {
        const prevDoc = await this.friendRepo.getRequestConditionally({reciever: body.sender, sender: body.reciever});
        if(prevDoc && prevDoc.length > 0) {
            const deletePrevDoc = await this.friendRepo.deleteFriendship(prevDoc[0]._id as string);
            if(!deletePrevDoc) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Error deleting previous instance of rejected request");    
        }
        const newRequest = await this.friendRepo.createFriendRequest(body);
        if(!newRequest) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Error Creating send request records");

        // TODO: send the reciever a notificaiton saying he has recieved a friend request. 

        return newRequest;   
    }

    async acceptFriendRequest(body: IFriendship): Promise<IFriendshipDocument | null> {
        return null;
    }

    async cancelFriendRequest(body: IFriendship): Promise<IFriendshipDocument | null> {
        const prevDoc = await this.friendRepo.getRequestConditionally({sender: body.sender, reciever: body.reciever});
        if(!prevDoc || (prevDoc && prevDoc.length == 0)) throw new AppError(StatusCodes.BAD_REQUEST, "The request does not exists");

        const cancelledReq = await this.friendRepo.deleteFriendship(prevDoc[0]._id as string);
        if(!cancelledReq) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "removing the document from db failed");

        return cancelledReq;
    }

    async deleteFriendRequest(body: IFriendship): Promise<IFriendshipDocument | null> {
        return null;
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