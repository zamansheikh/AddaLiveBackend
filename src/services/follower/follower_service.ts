import { IFollower, IFollowerDocument } from "../../entities/followers/follower_model_interface";

export interface IFollowerService {
    createFollower(follow: IFollower): Promise<IFollowerDocument | null>
}




