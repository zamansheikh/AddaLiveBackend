import { FriendshipStatus, RequestTypes } from "../../core/Utils/enums";
import { IFriendship, IFriendshipDocument } from "../../entities/friendship/friendship_model_interface";

export default interface IFriendshipRepository {
    createFriendRequest(friendship: IFriendship): Promise<IFriendshipDocument | null>;
    updateFriendRequsetStatus(id: string, status:FriendshipStatus): Promise<IFriendshipDocument | null>;
    deleteFriendship(id: string): Promise<IFriendshipDocument | null>;
    getRequestLists(userId:string, requestType: RequestTypes): Promise<IFriendshipDocument[] | null>;
    getFriendList(userId:string): Promise<IFriendshipDocument[] | null>;
    getMutalFriends(user1:string, user2: string): Promise<IFriendshipDocument[] | null>;
}