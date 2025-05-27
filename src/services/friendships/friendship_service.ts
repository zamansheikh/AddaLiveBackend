import { IFriendship, IFriendshipDocument } from "../../entities/friendship/friendship_model_interface";
import IFriendshipRepository from "../../repository/friendships/friendship_repository_interface";
import IFriendshipService from "./friendship_service_interface";


class FriendshipService implements IFriendshipService {
    friendRepo: IFriendshipRepository;

    constructor(repo: IFriendshipRepository){
        this.friendRepo = repo;
    }

    async acceptFriendRequest(body: IFriendship): Promise<IFriendshipDocument | null> {
        return null;
    }

    async cancelFriendRequest(body: IFriendship): Promise<IFriendshipDocument | null> {
        return null;
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

    async sendFriendRequest(body: IFriendship): Promise<IFriendshipDocument | null> {
     return null;   
    }

    async sentRequsetLists(userId: string): Promise<IFriendshipDocument[] | null> {
        return null;
    }

}

export default FriendshipService;