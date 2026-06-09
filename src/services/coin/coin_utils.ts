/**
 * Shared utilities for coin transfer operations.
 *
 * Both `assignCoinToUser` (portal_user_service) and `giveCoinsToUser`
 * (app_reseller_service) follow the same core logic when adding coins
 * to a regular app user. This module extracts that common path so the
 * two callers only manage their own sender-side validation & deduction.
 */

import { ClientSession } from "mongoose";
import { UserRoles } from "../../core/Utils/enums";
import {
  determineUserLevel,
  determineUserTagAndBg,
} from "../../core/Utils/helper_functions";
import { ICoinHistory } from "../../models/coins/coinHistoryModel";
import { IUserDocument } from "../../models/user/user_model_interface";
import { ICoinHistoryRepository } from "../../repository/coins/coinHistoryRepository";
import { ILevelTagBgRepository } from "../../repository/users/level_tag_bg_repository";
import { IUserRepository } from "../../repository/users/user_repository";
import IUserStatsRepository from "../../repository/users/userstats_repository_interface";
import { IUSerStatsDocument } from "../../entities/userstats/userstats_interface";
import { SvipService } from "../svip/svip_service";

export interface CreditRegularUserCoinsParams {
  /** The receiving user's MongoDB _id. */
  userId: string;
  /** Number of coins to add. */
  coins: number;
  /** Pre-fetched target user document (needed for `totalBoughtCoins`). */
  targetUser: IUserDocument;
  /** Repository for the `users` collection. */
  userRepository: IUserRepository;
  /** Repository for the `userstats` collection. */
  userStatsRepository: IUserStatsRepository;
  /** Repository for level-tag/background lookups. */
  levelTagBgRepository: ILevelTagBgRepository;
  /** Repository for coin audit-history. */
  coinHistoryRepository: ICoinHistoryRepository;
  /** Role of the sender (used in the history record). */
  senderRole: UserRoles;
  /** _id of the sender (may be null for system origins). */
  senderId: string | null;
  /** Role of the receiver (used in the history record). */
  receiverRole: UserRoles;
  /** Active MongoDB transaction session. */
  session: ClientSession;
}

/**
 * Credits coins to a regular app user inside an **already-started** transaction.
 *
 * This covers three operations atomically:
 *  1. Increments the user's coin balance in `userstats`.
 *  2. If XP mode is OFF, recalculates the user's level, tag & background based
 *     on cumulative `totalBoughtCoins` and updates the `users` document.
 *  3. Persists an audit record in `coin_histories`.
 *
 * @returns The updated `userstats` document.
 */
export async function creditRegularUserCoins(
  params: CreditRegularUserCoinsParams,
): Promise<IUSerStatsDocument> {
  const {
    userId,
    coins,
    targetUser,
    userRepository,
    userStatsRepository,
    levelTagBgRepository,
    coinHistoryRepository,
    senderRole,
    senderId,
    receiverRole,
    session,
  } = params;

  // ── 1. Increment coin balance in UserStats ──────────────────────────────
  const stats = await userStatsRepository.updateCoins(userId, coins, session);

  // ── 2. Recalculate level if XP mode is OFF ──────────────────────────────
  const xpEnv = process.env.XP_MODE ?? "0";
  const isXpMode = xpEnv.toString() === "1";
  if (!isXpMode) {
    const newLevel = determineUserLevel(
      (targetUser.totalBoughtCoins ?? 0) + coins,
    );
    const newTagAndBg = determineUserTagAndBg(newLevel);
    const tagAndBgDocument =
      await levelTagBgRepository.findByLevel(newTagAndBg);
    await userRepository.findUserByIdAndUpdate(
      userId,
      {
        totalBoughtCoins: (targetUser.totalBoughtCoins ?? 0) + coins,
        level: newLevel,
        currentLevelTag: tagAndBgDocument?.levelTag,
        currentLevelBackground: tagAndBgDocument?.levelBg,
      },
      session,
    );
  }

  // ── 3. Coin audit history ───────────────────────────────────────────────
  const historyObj: ICoinHistory = {
    senderRole,
    senderId,
    receiverRole,
    receiverId: userId,
    amount: coins,
  };
  await coinHistoryRepository.createHistory(historyObj, session);

  // ── 4. SVIP milestone tracking — runs inside the same transaction ──────
  await SvipService.trackRecharge(userId, coins, session);

  return stats;
}
