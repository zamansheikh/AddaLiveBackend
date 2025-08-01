import { StatusCodes } from "http-status-codes";
import { AdminPowers, UserRoles } from "../../core/Utils/enums";
import { IPagination } from "../../core/Utils/query_builder";
import { IUSerStatsDocument } from "../../entities/userstats/userstats_interface";
import { IUserDocument } from "../../models/user/user_model_interface";
import { IAdminRepository } from "../../repository/admin/admin_repository";
import { IPortalUserRepository } from "../../repository/portal_user/portal_user_repository";
import { IUserRepository } from "../../repository/user_repository";
import IUserStatsRepository from "../../repository/userstats/userstats_repository_interface";
import AppError from "../../core/errors/app_errors";
import { canUserUpdate } from "../../core/Utils/helper_functions";
import mongoose from "mongoose";

export interface ISharedPowerService {
  searchUserEmail(
    email: string,
    query: Record<string, unknown>
  ): Promise<{ pagination: IPagination; users: IUserDocument[] } | null>;
  promoteUser(
    id: string,
    permissions: string[],
    userRole: UserRoles,
    myId: string,
    myRole: UserRoles
  ): Promise<IUserDocument | null>;
  assignCoinToUser(
    userId: string,
    coins: number,
    myId: string,
    role: UserRoles
  ): Promise<IUSerStatsDocument | null>;
  demoteUser(userId: string): Promise<IUserDocument | null>;
}

export default class SharedPowerService implements ISharedPowerService {
  UserRepository: IUserRepository;
  UserStatsRepository: IUserStatsRepository;
  AdminRepository: IAdminRepository;
  PortalUserRepository: IPortalUserRepository;
  constructor(
    UserRepository: IUserRepository,
    UserStatsRepository: IUserStatsRepository,
    AdminRepository: IAdminRepository,
    PortalUserRepository: IPortalUserRepository
  ) {
    this.UserRepository = UserRepository;
    this.UserStatsRepository = UserStatsRepository;
    this.AdminRepository = AdminRepository;
    this.PortalUserRepository = PortalUserRepository;
  }

  async searchUserEmail(
    email: string,
    query: Record<string, unknown>
  ): Promise<{ pagination: IPagination; users: IUserDocument[] } | null> {
    const users = await this.UserRepository.searchUserByEmail(email, query);
    return users;
  }

  async promoteUser(
    id: string,
    permissions: string[],
    userRole: UserRoles,
    myId: string,
    myRole: UserRoles
  ): Promise<IUserDocument | null> {
    let myProfile;
    if (myRole == UserRoles.Admin) {
      myProfile = await this.AdminRepository.getAdminById(myId);
    } else {
      myProfile = await this.UserRepository.findUserById(myId);
    }
    if (!myProfile) throw new AppError(StatusCodes.NOT_FOUND, "Notvalid token");

    const user = await this.UserRepository.findUserById(id);
    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    const hasPermission = canUserUpdate(myProfile, [AdminPowers.PromoteUser]);
    if (!hasPermission)
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        "You are not authorized to perform this action"
      );

    const updatedUser = await this.UserRepository.findUserByIdAndUpdate(id, {
      userRole: userRole,
      userPermissions: permissions,
    });

    if (!updatedUser) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to update user"
      );
    }
    return updatedUser;
  }
  async assignCoinToUser(
    userId: string,
    coins: number,
    myId: string,
    role: UserRoles
  ): Promise<IUSerStatsDocument | null> {
    const user = await this.UserRepository.findUserById(userId);
    let myProfile;
    if (role == UserRoles.Admin) {
      myProfile = await this.AdminRepository.getAdminById(myId);
    } else {
      myProfile = await this.UserRepository.findUserById(myId);
    }
    if (!myProfile)
      throw new AppError(StatusCodes.NOT_FOUND, "Not valid token");

    // todo: update the functiuon
    const canUpdateCoins = canUserUpdate(myProfile, [
      AdminPowers.CoinDistribute,
    ]);

    if (!canUpdateCoins)
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        "You are not authorized to perform this action"
      );

    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }
    const session = await mongoose.startSession();
    session.startTransaction();

    // todo: handle for admin as he does not have user stats

    let myStats;
    if (role == UserRoles.Admin) {
      myStats = await this.AdminRepository.getAdminById(myId);
    } else if (role == UserRoles.Agency) {
      myStats = await this.UserStatsRepository.getUserStats(myId);
    }

    if (!myStats)
      throw new AppError(StatusCodes.NOT_FOUND, "My stats not found");
    if (myStats.coins! < coins)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "You do not have enough coins to assign"
      );
    let myUpdatedStats;
    if (role == UserRoles.Admin) {
      myUpdatedStats = await this.AdminRepository.updateCoin(
        myId,
        -coins,
        session
      );
    } else {
      myUpdatedStats = await this.UserStatsRepository.updateDiamonds(
        myId,
        -coins,
        session
      );
    }
    if (!myUpdatedStats)
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to update my stats"
      );
    const updatedUser = await this.UserStatsRepository.updateCoins(
      userId,
      coins,
      session
    );
    if (!updatedUser) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to assign coins to user"
      );
    }
    await session.commitTransaction();
    session.endSession();
    return updatedUser;
  }


    async demoteUser(userId: string): Promise<IUserDocument | null> {
    const user = await this.UserRepository.findUserById(userId);
    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }
    if (user.userRole === UserRoles.User) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "User is already a regular user"
      );
    }
    const updatedUser = await this.UserRepository.findUserByIdAndUpdate(
      userId,
      { userRole: UserRoles.User, userPermissions: [] }
    );
    if (!updatedUser) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to demote user"
      );
    }
    return updatedUser;
  }
}
