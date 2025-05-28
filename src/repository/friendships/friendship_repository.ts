import { FriendshipStatus, RequestTypes } from "../../core/Utils/enums";
import { IFriendship, IFriendshipDocument, IFriendshipModel } from "../../entities/friendship/friendship_model_interface";
import IFriendshipRepository, { ICondition } from "./friendship_repository_interface";

class FriendshipRepository implements IFriendshipRepository {

    friendsModel: IFriendshipModel;

    constructor(friendsModel: IFriendshipModel) {
        this.friendsModel = friendsModel;
    }


    async createFriendRequest(friendship: IFriendship): Promise<IFriendshipDocument | null> {
        const friendReq = new this.friendsModel(friendship);
        return await friendReq.save();
    }

    async deleteFriendship(id: string): Promise<IFriendshipDocument | null> {
        return await this.friendsModel.findByIdAndDelete(id);
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
        return await this.friendsModel.findByIdAndUpdate(id, { status }, { new: true });
    }

    async getRequestConditionally(condition: ICondition): Promise<IFriendshipDocument[]> {
        const searchCondition = {
            $or: [
                { sender: condition.sender, reciever: condition.reciever, },
                { sender: condition.reciever, reciever: condition.sender, }
            ]
        }
        return await this.friendsModel.find(searchCondition);
    }

}

export default FriendshipRepository;