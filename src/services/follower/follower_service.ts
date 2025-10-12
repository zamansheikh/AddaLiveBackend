import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IFollower, IFollowerDocument } from "../../entities/followers/follower_model_interface";
import { IFollowerRepository } from "../../repository/follower/follower_repository";
import { IPagination } from "../../core/Utils/query_builder";
import IFriendshipRepository from "../../repository/friendships/friendship_repository_interface";
import mongoose from "mongoose";
import { IFriendshipDocument } from "../../entities/friendship/friendship_model_interface";
import { IUserRepository } from "../../repository/users/user_repository";

export interface IFollowerService {
    createFollower(follow: IFollower): Promise<IFollowerDocument | null>;
    deleteFollower(follow: IFollower): Promise<IFollowerDocument | null>;
    followingList(myId: string,userId: string, query: Record<string, any>): Promise<{ pagination: IPagination, data: IFollowerDocument[] } | null>;
    followerList(myId: string,userId: string, query: Record<string, any>): Promise<{ pagination: IPagination, data: IFollowerDocument[] } | null>;
    friendList(userId: string, query: Record<string, any>): Promise<{ pagination: IPagination, data: IFriendshipDocument[] } | null>;
    getFollowerAndFollowingCount(userId: string): Promise<{ followerCount: number, followingCount: number; friendshipCount: number;  }>;
}



export default class FollowerService implements IFollowerService {
    FollowerRepository: IFollowerRepository
    UserRepository: IUserRepository;
    FriendShipRepository: IFriendshipRepository;
    constructor(followerRepository: IFollowerRepository, userRepository: IUserRepository, friendShipRepository: IFriendshipRepository) {
        this.FollowerRepository = followerRepository;
        this.UserRepository = userRepository;
        this.FriendShipRepository = friendShipRepository;
    }

    async createFollower(follow: IFollower): Promise<IFollowerDocument | null> {
        if (follow.myId === follow.followerId) throw new AppError(StatusCodes.BAD_REQUEST, "You cannot follow yourself");
        const user1 = await this.UserRepository.findUserById(follow.myId.toString());
        const user2 = await this.UserRepository.findUserById(follow.followerId.toString());
        if (!user1 || !user2) throw new AppError(StatusCodes.NOT_FOUND, "User not found");

        // check if i already follow that person
        const prevFollower = await this.FollowerRepository.findFollower(follow);
        if (prevFollower) throw new AppError(StatusCodes.BAD_REQUEST, "You are already following this user");

        // transactional safety
        const session = await mongoose.startSession();
        session.startTransaction();

        const follower = await this.FollowerRepository.createFollower(follow, session);
        if (!follower) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Something went wrong while following the user");

        // checking if the other person is following me
        const mutualFollow = await this.FollowerRepository.findFollower({ myId: follow.followerId, followerId: follow.myId }, session);
        if (mutualFollow) {
            // check for existing friendship
            const existingFriendship = await this.FriendShipRepository
                .existingFriendship({
                    user1: new mongoose.Types.ObjectId(follow.myId.toString()),
                    user2: new mongoose.Types.ObjectId(follow.followerId.toString())
                }, session);

            if (!existingFriendship) {
                const friendship = await this.FriendShipRepository
                    .createFriendShip({
                        user1: new mongoose.Types.ObjectId(follow.myId.toString()),
                        user2: new mongoose.Types.ObjectId(follow.followerId.toString())
                    }, session);
                if (!friendship) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Something went wrong while creating the friendship");
            }
        }

        // safely executing all the operations.
        await session.commitTransaction();
        await session.endSession();

        return follower;
    };

    async deleteFollower(follow: IFollower): Promise<IFollowerDocument | null> {
        const user1 = await this.UserRepository.findUserById(follow.myId.toString());
        const user2 = await this.UserRepository.findUserById(follow.followerId.toString());
        if (!user1 || !user2) throw new AppError(StatusCodes.NOT_FOUND, "User not found");

        const prevFollower = await this.FollowerRepository.findFollower(follow);
        if (!prevFollower) throw new AppError(StatusCodes.BAD_REQUEST, "You are not following this user");

        const session = await mongoose.startSession();
        session.startTransaction();

        const unfollow = await this.FollowerRepository.deleteFollowerById(prevFollower.id, session);
        if (!unfollow) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Something went wrong while unfollowing the user");

        const existingFriendship = await this.FriendShipRepository
            .existingFriendship({
                user1: new mongoose.Types.ObjectId(follow.myId.toString()),
                user2: new mongoose.Types.ObjectId(follow.followerId.toString())
            }, session);

        if (existingFriendship) {
            await this.FriendShipRepository.deleteFriendship(existingFriendship.id, session);
        }

        await session.commitTransaction();
        await session.endSession();
        return unfollow;
    }


    async followerList(myId: string,  userId: string, query: Record<string, any>): Promise<{ pagination: IPagination; data: IFollowerDocument[]; } | null> {
        const user = await this.UserRepository.findUserById(userId);
        const myself = await this.UserRepository.findUserById(myId);
        if (!user || !myself) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
        const followers = await this.FollowerRepository.getFollowerLists(myId,{ myId: userId }, query);
        if (!followers) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Something went wrong while fetching the followers list");
        return followers;

    }


    async followingList(myId:string, userId: string, query: Record<string, any>): Promise<{ pagination: IPagination; data: IFollowerDocument[]; } | null> {
        const user = await this.UserRepository.findUserById(userId);
        const myself = await this.UserRepository.findUserById(myId);
        if (!user|| !myself) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
        const following = await this.FollowerRepository.getFollowerLists(myId, { followerId: userId }, query);
        if (!following) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Something went wrong while fetching the following list");
        return following;
    }

    async friendList(userId: string, query: Record<string, any>): Promise<{ pagination: IPagination; data: IFriendshipDocument[]; } | null> {
        const user = await this.UserRepository.findUserById(userId);
        if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");

        const friends = await this.FriendShipRepository.getFriendLists(userId, query);
        if (!friends) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Something went wrong while fetching the friend list");
        return friends;
    }


    async getFollowerAndFollowingCount(userId: string): Promise<{ followerCount: number; followingCount: number; friendshipCount: number; }> {
        const user = await this.UserRepository.findUserById(userId);
        if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
        const followerCount = await this.FollowerRepository.getFollowerCount(userId);
        const followingCount = await this.FollowerRepository.getFollowingCount(userId);
        const friendshipCount = await this.FriendShipRepository.getFriendShipCount(userId);
        return { followerCount, followingCount, friendshipCount };
    }
}
