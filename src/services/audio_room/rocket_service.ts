import { AudioRoomCache } from "../../core/cache/audio_room_cache";
import AppError from "../../core/errors/app_errors";
import { XpHelper } from "../../core/helper_classes/xp_helper";
import { RepositoryProviders } from "../../core/providers/repository_providers";
import { RedisFolderProvider } from "../../core/redis/redis_folder_provider";
import RedisService from "../../core/redis/redis_service";
import SingletonSocketServer from "../../core/sockets/singleton_socket_server";
import {
  COIN_MAX,
  COIN_MIN,
  REWARD_NUMBERS,
  ROCKET_MILESTONES,
  XP_MAX,
  XP_MIN,
} from "../../core/Utils/constants";
import { AudioRoomChannels, LaunchGiftTypes } from "../../core/Utils/enums";
import { getRandomNumberFromRange } from "../../core/Utils/helper_functions";
import {
  IAudioRoomDocument,
  IMemberDetails,
} from "../../models/audio_room/audio_room_model";
import { IMyBucket } from "../../models/store/my_bucket_model";
import { IStoreItemDocument } from "../../models/store/store_item_model";

export interface ILaunchGifts {
  type: LaunchGiftTypes;
  thumbnail: string;
  quantity: number;
}

export interface IRewarededUser extends IMemberDetails {
  gifts: ILaunchGifts[];
}

export interface IRocketServiceResponse {
  roomId: string;
  fuel?: number;
  level: number;
  milestone: number;
  percentage?: number;
  top1?: IRewarededUser;
}

export default class RocketService {
  private static instance: RocketService | null = null;
  // folder properties
  private static readonly ROCKET_SERVICE_FOLDER =
    RedisFolderProvider.RocketServiceFolderPrefix;
  private static readonly FUEL_KEY_PREFIX = `${this.ROCKET_SERVICE_FOLDER}:fuel:`;
  private static readonly LEVEL_KEY_PREFIX = `${this.ROCKET_SERVICE_FOLDER}:level:`;
  private static readonly ROCKET_MILESTONE_KEY_PREFIX = `${this.ROCKET_SERVICE_FOLDER}:milestone:`;
  private static readonly REWARDED_USERS_KEY_PREFIX = `${this.ROCKET_SERVICE_FOLDER}:rewarded_users:`;

  // Maximum recursive launches per addFuel call to prevent infinite loops
  private static readonly MAX_RECURSION_DEPTH = 20;

  // repositories
  private giftRecordRepository =
    RepositoryProviders.giftRecordRepositoryProvider;
  private storeCategoryRepository =
    RepositoryProviders.storeCategoryRepositoryProvider;
  private storeItemRepository = RepositoryProviders.storeItemRepositoryProvider;
  private myBucketRepository = RepositoryProviders.myBucketRepositoryProvider;
  private userStatsRepository = RepositoryProviders.userStatsRepositoryProvider;
  private userRepository = RepositoryProviders.userRepositoryProvider;
  private audioRoomRepository = RepositoryProviders.audioRoomRepositoryProvider;

  private redis = RedisService.getInstance();

  private constructor() {}

  public static getInstance(): RocketService {
    if (!RocketService.instance) {
      RocketService.instance = new RocketService();
    }
    return RocketService.instance;
  }

  /**
   * Adds fuel to the rocket in a specific room
   * @param roomId ID of the audio room
   * @param amount Amount of fuel to add
   */
  public async addFuel(roomId: string, amount: number) {
    console.log(`[RocketService] addFuel called for room: ${roomId}, amount: ${amount}`);
    const isValid = await AudioRoomCache.getInstance().validateRoomId(roomId);
    if (!isValid) {
      console.warn(`[RocketService] Invalid roomId: ${roomId}`);
      return;
    }
    const { fuel, level, milestone } =
      await this.setRocketDefaultValues(roomId);

    const newFuel = fuel + amount;
    const fuelPercentage = (newFuel / milestone) * 100;

    console.log(`[RocketService] Room: ${roomId}, Current Fuel: ${fuel}, New Fuel: ${newFuel}, Milestone: ${milestone}, Level: ${level}`);

    // Step 1: Check if new fuel reaches or exceeds the milestone
    if (newFuel >= milestone) {
      console.log(`[RocketService] Milestone reached! Launching rocket for room: ${roomId}`);
      // Rocket launch logic
      await this.launchRocket(roomId, newFuel, level);
    } else {
      // Step 2: Update the current fuel in Redis and notify the room
      const fuelKey = `${RocketService.FUEL_KEY_PREFIX}${roomId}`;
      await this.redis.set(fuelKey, newFuel.toString());
      console.log(`[RocketService] Fuel updated in Redis for room: ${roomId}`);

      // Notify the whole room about the new fuel
      const socketServer = SingletonSocketServer.getInstance();

      socketServer.emitToRoom(
        roomId,
        AudioRoomChannels.NewRocketFuelPercentage,
        {
          roomId,
          fuel: newFuel,
          level: level,
          milestone: milestone,
          percentage: parseFloat(fuelPercentage.toFixed(2)),
        } as IRocketServiceResponse,
      );
    }

    return { fuel: newFuel, level, milestone };
  }

  /**
   * this function will be called when the fuel reaches or exceeds the milestone
   * @param roomId // id of the room
   * @param fuel // the amount of fuel gifted
   * @param level // current level of the room
   */
  private async launchRocket(
    roomId: string,
    fuel: number,
    level: number,
    room?: IAudioRoomDocument,
    recursionDepth: number = 0,
  ) {
    console.log(`[RocketService] launchRocket initiated for room: ${roomId}, Level: ${level}, Fuel: ${fuel}`);
    // Always fetch fresh room data to ensure proper hydration of membersArray and latest state
    const freshRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    console.log(`[RocketService] Fresh room data fetched. Members Count: ${freshRoom.membersArray?.length || 0}`);

    // Capture values for the current launch and next state to avoid closure bugs
    const launchLevel = level;
    const nextLevel = (level % 5) + 1;

    // calculate the remaining fuel
    const remainingFuel = fuel - ROCKET_MILESTONES[level - 1];
    console.log(`[RocketService] launchLevel: ${launchLevel}, nextLevel: ${nextLevel}, remainingFuel: ${remainingFuel}`);

    // reward the users
    console.log(`[RocketService] Calculating rewards...`);
    const rewardedUsers = await this.rewardUsers(freshRoom, launchLevel);
    
    // Print a clean summary of rewards for diagnostic purposes
    console.log(`\n--- [RocketService] REWARDS SUMMARY FOR ROOM: ${freshRoom.title} ---`);
    console.table(rewardedUsers.map(u => ({
      Name: u.name,
      UID: u.uid,
      Gifts: u.gifts.map(g => `${g.quantity} ${g.type}`).join(", ")
    })));
    console.log(`------------------------------------------------------------------\n`);

    console.log(`[RocketService] Rewards calculated. Eligible Users: ${rewardedUsers.length}`);
    // save the rewarded users for api usages
    await this.saveRewardedUsers(rewardedUsers, roomId);

    const socketServer = SingletonSocketServer.getInstance();

    // banner notification (scope: global) - IMMEDIATE
    console.log(`[RocketService] Emitting global rocket banner...`);
    socketServer.emitGlobalRocketBanner({
      roomId: roomId,
      message: `Rocket in ${freshRoom.title || "Room"} has been launched`,
      rocketLevel: launchLevel,
      roomPhoto: freshRoom.roomPhoto || "",
    });

    // Schedule the room-specific events for 10s later
    console.log(`[RocketService] Scheduling room-specific events for 10s later...`);
    setTimeout(() => {
      console.log(`[RocketService] 10s timeout reached. Emitting room events for ${roomId}`);
      // notifying the app about the rocket launch (scope: room)
      socketServer.emitToRoom(roomId, AudioRoomChannels.LaunchRocket, {
        roomId,
        fuel,
        level: launchLevel,
        top1: rewardedUsers[0] || null,
      });
      // Notify Level Update
      socketServer.emitToRoom(roomId, AudioRoomChannels.NewRocketLevel, {
        roomId,
        level: nextLevel,
        milestone: ROCKET_MILESTONES[nextLevel - 1],
      } as IRocketServiceResponse);
    }, 10000);

    // update the rocket informations (update level, update milestone, update fuel) - IMMEDIATE
    const fuelKey = `${RocketService.FUEL_KEY_PREFIX}${roomId}`;
    const levelKey = `${RocketService.LEVEL_KEY_PREFIX}${roomId}`;
    const milestoneKey = `${RocketService.ROCKET_MILESTONE_KEY_PREFIX}${roomId}`;

    console.log(`[RocketService] Updating Redis state: Level -> ${nextLevel}, Fuel -> 0`);
    await this.redis.set(fuelKey, "0");
    await this.redis.set(levelKey, nextLevel.toString());
    await this.redis.set(
      milestoneKey,
      ROCKET_MILESTONES[nextLevel - 1].toString(),
    );

    // recursive call (if the remaining fuel is greater than the next milestone)
    if (remainingFuel >= ROCKET_MILESTONES[nextLevel - 1]) {
      if (recursionDepth >= RocketService.MAX_RECURSION_DEPTH) {
        console.warn(`[RocketService] Max recursion depth (${RocketService.MAX_RECURSION_DEPTH}) reached for room: ${roomId}. Remaining fuel ${remainingFuel} not further processed.`);
        // Emit final fuel notification so the room knows the leftover fuel
        socketServer.emitToRoom(roomId, AudioRoomChannels.NewRocketFuelPercentage, {
          roomId,
          fuel: remainingFuel,
          level: nextLevel,
          milestone: ROCKET_MILESTONES[nextLevel - 1],
          percentage: parseFloat(
            ((remainingFuel / ROCKET_MILESTONES[nextLevel - 1]) * 100).toFixed(2),
          ),
        } as IRocketServiceResponse);
        return;
      } else {
        console.log(`[RocketService] Remaining fuel (${remainingFuel}) exceeds next milestone (${ROCKET_MILESTONES[nextLevel - 1]}). Triggering recursive launch...`);
        // delay the next launch by 45 seconds
        await new Promise((resolve) => setTimeout(resolve, 45000));
        await this.launchRocket(roomId, remainingFuel, nextLevel, undefined, recursionDepth + 1);
        return;
      }
    }
    // fuel notification (scope: room)
    socketServer.emitToRoom(roomId, AudioRoomChannels.NewRocketFuelPercentage, {
      roomId,
      fuel: remainingFuel,
      level: nextLevel,
      milestone: ROCKET_MILESTONES[nextLevel - 1],
      percentage: parseFloat(
        ((remainingFuel / ROCKET_MILESTONES[nextLevel - 1]) * 100).toFixed(2),
      ),
    } as IRocketServiceResponse);
  }

  private async rewardUsers(room: IAudioRoomDocument, level: number) {
    console.log(`[RocketService] rewardUsers called for room: ${room.roomId}, Level: ${level}`);
    // the number of users eligible for reward recieve
    // Ensure we don't go out of bounds of the REWARD_NUMBERS array
    const rewardIndex = Math.min(level - 1, REWARD_NUMBERS.length - 1);
    let rewardableUserCount = REWARD_NUMBERS[rewardIndex] || 0;

    // sort the users based on gift sent
    const members = (room.membersArray as unknown as IMemberDetails[]) || [];
    console.log(`[RocketService] Total members found in document: ${members.length}. Eligible count from REWARD_NUMBERS: ${rewardableUserCount}`);

    // randomize the order
    for (let i = members.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [members[i], members[j]] = [members[j], members[i]];
    }

    // adjust the number if the number of room users is less than the number of users eligible for reward
    if (members.length < rewardableUserCount) {
      console.log(`[RocketService] Capping rewardableUserCount to members.length: ${members.length}`);
      rewardableUserCount = members.length;
    }
    // to store the rewarded user informations
    /**
     * first user recieves -> 2 assets, Xps and coins
     * second user recieves -> 1 asset, Xps and coins
     * third user recieves -> Xps and coins
     * nth user recieves -> only coins
     */
    const rewardPromises = members.slice(0, rewardableUserCount).map(async (user, i) => {
      if (!user || !user._id) {
        console.warn(`[RocketService] Skipping user at index ${i} - missing data or _id`);
        return null;
      }

      const rewards: ILaunchGifts[] = [];
      const userIdStr = user._id.toString();
      const taskPromises: Promise<void>[] = [];

      if (i === 0) {
        // first user extra reward (4 days)
        taskPromises.push((async () => {
          const assetThumbnail = await this.addAssetToUser(userIdStr, 4);
          rewards.push({ quantity: 4, thumbnail: assetThumbnail, type: LaunchGiftTypes.Assets });
        })());
      }
      
      if (i < 2) {
        // top 2 users extra reward (3 days)
        taskPromises.push((async () => {
          const assetThumbnail = await this.addAssetToUser(userIdStr, 3);
          rewards.push({ quantity: 3, thumbnail: assetThumbnail, type: LaunchGiftTypes.Assets });
        })());
      }

      if (i < 3) {
        // top 3 users get XP
        taskPromises.push((async () => {
          const xp = await this.addXpToUser(userIdStr);
          rewards.push({ quantity: xp, thumbnail: "xp", type: LaunchGiftTypes.XP });
        })());
      }

      // Everyone gets coins
      taskPromises.push((async () => {
        const coins = await this.addCoinsToUser(userIdStr);
        rewards.push({ quantity: coins, thumbnail: "coins", type: LaunchGiftTypes.Coins });
      })());

      await Promise.all(taskPromises);

      return {
        ...user,
        gifts: rewards,
      };
    });

    const rewardedUsersResults = await Promise.all(rewardPromises);
    return rewardedUsersResults.filter((u) => u !== null) as IRewarededUser[];
  }

  private async saveRewardedUsers(
    rewardedUsers: IRewarededUser[],
    roomId: string,
  ) {
    try {
      const key = `${RocketService.REWARDED_USERS_KEY_PREFIX}${roomId}`;
      await this.redis.set(key, rewardedUsers, 86400); // Expires in 24 hours
      console.log(
        `[RocketService] Rewarded users saved for room: ${roomId}, Count: ${rewardedUsers.length}`,
      );
    } catch (error) {
      console.error(
        `[RocketService] Error saving rewarded users for room ${roomId}:`,
        error,
      );
      throw error;
    }
  }

  public async getRewardedUsers(roomId: string) {
    const key = `${RocketService.REWARDED_USERS_KEY_PREFIX}${roomId}`;
    try {
      const result = await this.redis.get<IRewarededUser[]>(key);
      console.log(
        `[RocketService] Retrieved rewarded users for room: ${roomId}, Result:`,
        result ? `${result.length} users` : "null",
      );
      return result;
    } catch (error) {
      console.error(
        `[RocketService] Error retrieving rewarded users for room ${roomId}:`,
        error,
      );
      return null;
    }
  }

  // this function adds asset to the
  private async addAssetToUser(
    targetUserId: string,
    duration: number,
  ): Promise<string> {
    console.log(`[RocketService] addAssetToUser for User: ${targetUserId}, Duration: ${duration}d`);
    // select a random category
    const categories: { _id: string; name: string }[] = (
      await this.storeCategoryRepository.getAllCategories()
    )
      .filter((obj) => obj.isPremium != true)
      .map((obj) => ({ _id: obj._id, name: obj.title })) as {
      _id: string;
      name: string;
    }[];

    if (categories.length === 0) {
      console.warn(`[RocketService] No suitable categories available for asset reward`);
      return "no-categories-available";
    }

    const randomCategory: { _id: string; name: string } =
      categories[Math.floor(Math.random() * categories.length)];

    // select a random item
    const items = await this.storeItemRepository.getAllStoreItemByCategory(
      randomCategory._id,
    );
    if (items.length == 0) {
      console.warn(`[RocketService] No items in category ${randomCategory.name}`);
      return "item-unavailable";
    }
    const randomItem: IStoreItemDocument = items[
      Math.floor(Math.random() * items.length)
    ] as IStoreItemDocument;

    console.log(`[RocketService] Selected Asset: ${randomItem.name} from category ${randomCategory.name}`);

    // add the item to users bucket
    const bucket: IMyBucket = {
      categoryId: randomCategory._id,
      itemId: randomItem._id as string,
      ownerId: targetUserId,
      expireAt: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
    };
    // return the category if success else error for reference
    try {
      await this.myBucketRepository.createNewBucket(bucket);
      console.log(`[RocketService] Asset successfully added to user bucket`);
      // Return the functional thumbnail (preview or logo)
      return randomItem.previewFile || randomItem.logo || "asset-thumbnail";
    } catch (error) {
      console.error(`[RocketService] Error adding asset to user bucket:`, error);
      return "error";
    }
  }

  private async addXpToUser(targetUserId: string): Promise<number> {
    const xpAmount = getRandomNumberFromRange(XP_MIN, XP_MAX);
    console.log(`[RocketService] addXpToUser for User: ${targetUserId}, Amount: ${xpAmount}`);
    await XpHelper.getInstance().updateUserXp(targetUserId, xpAmount);
    return xpAmount;
  }

  private async addCoinsToUser(targetUserId: string): Promise<number> {
    const coins = getRandomNumberFromRange(COIN_MIN, COIN_MAX);
    console.log(`[RocketService] addCoinsToUser for User: ${targetUserId}, Amount: ${coins}`);
    const userStats = await this.userStatsRepository.updateCoins(
      targetUserId,
      coins,
    );
    if (!userStats) return 0;
    return coins;
  }

  /**
   * Fetches the current rocket information for a specific room
   * @param roomId ID of the audio room
   * @returns Rocket information including percentage
   */
  public async getRocketInfo(roomId: string): Promise<IRocketServiceResponse> {
    const { fuel, level, milestone } =
      await this.setRocketDefaultValues(roomId);
    const fuelPercentage = (fuel / milestone) * 100;

    return {
      roomId,
      fuel,
      level,
      milestone,
      percentage: parseFloat(fuelPercentage.toFixed(2)),
    };
  }

  private async setRocketDefaultValues(roomId: string): Promise<{
    fuel: number;
    level: number;
    milestone: number;
  }> {
    try {
      const isValid = await AudioRoomCache.getInstance().validateRoomId(roomId);
      if (!isValid) {
        throw new AppError(404, "Room not found");
      }
      /**
       * get the fuel, level, milestone from redis.
       * if does not exist set the default values
       * LEVEL -> 1
       * FUEL -> 0
       * MILESTONE -> ROCKET_MILESTONES[0] from const
       * and return the values
       */
      const fuelKey = `${RocketService.FUEL_KEY_PREFIX}${roomId}`;
      const levelKey = `${RocketService.LEVEL_KEY_PREFIX}${roomId}`;
      const milestoneKey = `${RocketService.ROCKET_MILESTONE_KEY_PREFIX}${roomId}`;

      let fuel: string | null = await this.redis.get(fuelKey);
      let level: string | null = await this.redis.get(levelKey);
      let milestone: string | null = await this.redis.get(milestoneKey);

      if (!fuel) {
        await this.redis.set(fuelKey, "0");
        fuel = "0";
      }

      if (!level) {
        await this.redis.set(levelKey, "1");
        level = "1";
      }

      if (!milestone) {
        await this.redis.set(milestoneKey, ROCKET_MILESTONES[0]);
        milestone = ROCKET_MILESTONES[0].toString();
      }

      return {
        fuel: parseInt(fuel), // Good idea to parse them here for easier use
        level: parseInt(level),
        milestone: parseInt(milestone),
      };
    } catch (error) {
      throw error;
    }
  }
}
