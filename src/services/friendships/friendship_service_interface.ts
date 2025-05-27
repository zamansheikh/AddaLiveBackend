import { IFriendship, IFriendshipDocument } from "../../entities/friendship/friendship_model_interface";

export default interface IFriendshipService {

    sendFriendRequest(body: IFriendship): Promise<IFriendshipDocument | null>;

    acceptFriendRequest(body: IFriendship): Promise<IFriendshipDocument | null>;

    removeFromFriend(body: IFriendship): Promise<IFriendshipDocument | null>;

    deleteFriendRequest(body: IFriendship): Promise<IFriendshipDocument | null>;

    cancelFriendRequest(body: IFriendship): Promise<IFriendshipDocument | null>;

    sentRequsetLists(userId: string): Promise<IFriendshipDocument[] | null>;

    recievedRequsetLists(userId: string): Promise<IFriendshipDocument[] | null>;

    myFriendLists(userId: string): Promise<IFriendshipDocument[] | null>;

    othersFriendLists(userId: string): Promise<IFriendshipDocument[] | null>;

    getMutualFriends(user1: string, user2: string): Promise<IFriendshipDocument[] | null>;
    
}