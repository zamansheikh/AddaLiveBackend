import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IFollower, IFollowerDocument } from "../../entities/followers/follower_model_interface";
import { IFollowerRepository } from "../../repository/follower/follower_repository";
import { IUserRepository } from "../../repository/user_repository_interface";
import { IPagination } from "../../core/Utils/query_builder";

export interface IFollowerService {
    createFollower(follow: IFollower): Promise<IFollowerDocument | null>;
    deleteFollower(follow: IFollower): Promise<IFollowerDocument | null>;
    followingList(userId: string, query: Record<string, any>): Promise<{ pagination: IPagination, data: IFollowerDocument[] } | null>;
    followerList(userId: string, query: Record<string, any>): Promise<{ pagination: IPagination, data: IFollowerDocument[] } | null>;
    getFollowerAndFollowingCount(userId: string): Promise<{ followerCount: number, followingCount: number }>;
}



export default class FollowerService implements IFollowerService {
    FollowerRepository: IFollowerRepository
    UserRepository: IUserRepository;
    constructor(followerRepository: IFollowerRepository, userRepository: IUserRepository) {
        this.FollowerRepository = followerRepository;
        this.UserRepository = userRepository;
    }

    async createFollower(follow: IFollower): Promise<IFollowerDocument | null> {
        if(follow.myId === follow.followerId) throw new AppError(StatusCodes.BAD_REQUEST, "You cannot follow yourself");
        const user1 = await this.UserRepository.findUserById(follow.myId.toString());
        const user2 = await this.UserRepository.findUserById(follow.followerId.toString());
        if (!user1 || !user2) throw new AppError(StatusCodes.NOT_FOUND, "User not found");

        const prevFollower = await this.FollowerRepository.findFollower(follow);
        if (prevFollower) throw new AppError(StatusCodes.BAD_REQUEST, "You are already following this user");

        const follower = await this.FollowerRepository.createFollower(follow);
        if (!follower) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Something went wrong while following the user");
        return follower;
    };

    async deleteFollower(follow: IFollower): Promise<IFollowerDocument | null> {
        const user1 = await this.UserRepository.findUserById(follow.myId.toString());
        const user2 = await this.UserRepository.findUserById(follow.followerId.toString());
        if (!user1 || !user2) throw new AppError(StatusCodes.NOT_FOUND, "User not found");

        const prevFollower = await this.FollowerRepository.findFollower(follow);
        if (!prevFollower) throw new AppError(StatusCodes.BAD_REQUEST, "You are not following this user");

        const unfollow = await this.FollowerRepository.deleteFollowerById(prevFollower.id);
        if (!unfollow) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Something went wrong while unfollowing the user");
        return unfollow;
    }


    async followerList(userId: string, query: Record<string, any>): Promise<{ pagination: IPagination; data: IFollowerDocument[]; } | null> {
        const user = await this.UserRepository.findUserById(userId);
        if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");

        const followers = await this.FollowerRepository.getFollowerLists({ myId: userId }, query);
        if (!followers) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Something went wrong while fetching the followers list");
        return followers;

    }


    async followingList(userId: string, query: Record<string, any>): Promise<{ pagination: IPagination; data: IFollowerDocument[]; } | null> {
        const user = await this.UserRepository.findUserById(userId);
        if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");

        const following = await this.FollowerRepository.getFollowerLists({ followerId: userId }, query);
        if (!following) throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Something went wrong while fetching the following list");
        return following;
    }


    async getFollowerAndFollowingCount(userId: string): Promise<{ followerCount: number; followingCount: number; }> {
        const user = await this.UserRepository.findUserById(userId);
        if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }
}
