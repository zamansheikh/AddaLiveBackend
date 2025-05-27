import { FriendshipStatus, RequestTypes } from "../../core/Utils/enums";
import {  IFriendship, IFriendshipDocument, IFriendshipModel } from "../../entities/friendship/friendship_model_interface";
import IFriendshipRepository from "./friendship_repository_interface";

class FriendshipRepository implements IFriendshipRepository {

    friendsModel: IFriendshipModel;

    constructor(friendsModel: IFriendshipModel) {
        this.friendsModel = friendsModel;
    }


    async createFriendRequest(friendship: IFriendship): Promise<IFriendshipDocument | null> {
        return null;
    }

    async deleteFriendship(id: string): Promise<IFriendshipDocument | null> {
        return null;
    }

    async getFriendList(userId: string): Promise<IFriendshipDocument[] | null> {
        return null;
    }

    async getMutalFriends(user1: string, user2: string): Promise<IFriendshipDocument[] | null> {
        return null;
    }

    async getRequestLists(userId: string, requestType: RequestTypes): Promise<IFriendshipDocument[] | null> {
        return null;
    }

    async updateFriendRequsetStatus(id: string, status: FriendshipStatus): Promise<IFriendshipDocument | null> {
        return null;
    }

}

export default FriendshipRepository;