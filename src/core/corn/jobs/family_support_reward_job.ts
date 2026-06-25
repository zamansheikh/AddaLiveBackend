import { RepositoryProviders } from "../../providers/repository_providers";
import { DateHelper } from "../../helper_classes/date_helper";
import { IDistributedMember } from "../../../models/family/family_support_reward_history_model";

export const distributeFamilySupportRewards = async () => {
  console.log(
    "[FamilySupportReward] Job started",
    new Date().toLocaleString(),
  );

  const rewardRepo =
    RepositoryProviders.familySupportRewardRepositoryProvider;
  const memberRepo = RepositoryProviders.familyMemberRepositoryProvider;
  const userStatsRepo = RepositoryProviders.userStatsRepositoryProvider;
  const giftRecordRepo = RepositoryProviders.giftRecordRepositoryProvider;
  const historyRepo =
    RepositoryProviders.familySupportRewardHistoryRepositoryProvider;

  const rewardLevels = await rewardRepo.getAll();
  if (rewardLevels.length === 0) {
    console.log("[FamilySupportReward] No reward levels configured. Skipping.");
    return;
  }

  const ranking = await giftRecordRepo.getFamilyRanking(true);
  if (!ranking || ranking.length === 0) {
    console.log("[FamilySupportReward] No families in last week ranking. Skipping.");
    return;
  }

  const weekStart = DateHelper.getStartOfLastWeek(new Date());
  const weekEnd = DateHelper.getEndOfLastWeek(new Date());

  let processedCount = 0;

  for (const fam of ranking) {
    try {
      const familyId = fam.familyId.toString();
      const totalContribution = fam.totalContribution;

      const levelConfig = rewardLevels
        .filter((l) => totalContribution >= l.targetPoints)
        .pop();

      if (!levelConfig) continue;

      const existingHistory = await historyRepo.getByFamilyAndWeek(
        familyId,
        weekStart,
      );
      if (existingHistory) {
        console.log(
          `[FamilySupportReward] Family ${familyId} already rewarded for week ${weekStart.toISOString()}. Skipping.`,
        );
        continue;
      }

      const weeklyContributors =
        await giftRecordRepo.getWeeklyFamilyContributors(
          familyId,
          weekStart,
          weekEnd,
          20,
        );

      const leader = await memberRepo.getLeader(familyId);
      const leaderUser = leader?.userId as any;
      const leaderUserId =
        leaderUser?._id?.toString() || leaderUser?.toString();

      const topContributors: any[] = [];
      for (const entry of weeklyContributors) {
        if (entry.receiverId.toString() === leaderUserId) continue;
        const member = await memberRepo.getByUserId(entry.receiverId);
        if (member) {
          topContributors.push({
            ...member.toObject(),
            userId: member.userId,
            weeklyContribution: entry.weeklyContribution,
          });
        }
      }

      const payouts: IDistributedMember[] = [];

      const creditIfEligible = async (
        memberDoc: any,
        amount: number,
        role: string,
      ): Promise<IDistributedMember | null> => {
        if (!memberDoc) return null;
        const contribution =
          memberDoc.weeklyContribution ?? memberDoc.giftsReceived;
        if (contribution < levelConfig.minContributionRequired) {
          return null;
        }

        try {
          await userStatsRepo.updateCoins(
            memberDoc.userId._id
              ? memberDoc.userId._id.toString()
              : memberDoc.userId.toString(),
            amount,
          );
          return {
            userId: memberDoc.userId._id
              ? memberDoc.userId._id
              : memberDoc.userId,
            role,
            amount,
          };
        } catch (err) {
          console.error(
            `[FamilySupportReward] Failed to credit ${role} in family ${familyId}:`,
            err,
          );
          return null;
        }
      };

      if (leader) {
        const leaderEntry = weeklyContributors.find(
          (e) => e.receiverId.toString() === leaderUserId,
        );
        const leaderWithContribution = {
          ...leader.toObject(),
          userId: leader.userId,
          weeklyContribution: leaderEntry?.weeklyContribution || 0,
        };
        const p = await creditIfEligible(
          leaderWithContribution,
          levelConfig.leaderCut,
          "leader",
        );
        if (p) payouts.push(p);
      }

      const getNth = (n: number) => topContributors[n - 1] || null;

      const top1 = await creditIfEligible(
        getNth(1),
        levelConfig.top1Cut,
        "top1",
      );
      if (top1) payouts.push(top1);

      const top2 = await creditIfEligible(
        getNth(2),
        levelConfig.top2Cut,
        "top2",
      );
      if (top2) payouts.push(top2);

      const top3 = await creditIfEligible(
        getNth(3),
        levelConfig.top3Cut,
        "top3",
      );
      if (top3) payouts.push(top3);

      const sliceAndPay = async (
        startIdx: number,
        endIdx: number,
        amount: number,
        rolePrefix: string,
      ) => {
        for (let i = startIdx; i <= endIdx; i++) {
          const member = topContributors[i];
          if (!member) break;
          const p = await creditIfEligible(
            member,
            amount,
            `${rolePrefix}${i + 1}`,
          );
          if (p) payouts.push(p);
        }
      };

      await sliceAndPay(3, 9, levelConfig.top4To10Cut, "top4to10_");
      await sliceAndPay(10, 14, levelConfig.top11To15Cut, "top11to15_");
      await sliceAndPay(15, 19, levelConfig.top16To20Cut, "top16to20_");

      if (payouts.length === 0) {
        console.log(
          `[FamilySupportReward] Family ${familyId} reached level ${levelConfig.level} but no members met minContributionRequired. Skipping.`,
        );
        continue;
      }

      await historyRepo.create({
        familyId,
        weekStart,
        weekEnd,
        level: levelConfig.level,
        totalBonus: levelConfig.totalBonus,
        leaderCut: levelConfig.leaderCut,
        top1Cut: levelConfig.top1Cut,
        top2Cut: levelConfig.top2Cut,
        top3Cut: levelConfig.top3Cut,
        top4To10Cut: levelConfig.top4To10Cut,
        top11To15Cut: levelConfig.top11To15Cut,
        top16To20Cut: levelConfig.top16To20Cut,
        distributedMembers: payouts,
      });

      processedCount++;
      console.log(
        `[FamilySupportReward] Family ${familyId} rewarded at level ${levelConfig.level} — ${payouts.length} members paid.`,
      );
    } catch (err) {
      console.error(
        `[FamilySupportReward] Error processing family ${fam.familyId}:`,
        err,
      );
    }
  }

  console.log(
    `[FamilySupportReward] Job finished. ${processedCount} families rewarded. ${new Date().toLocaleString()}`,
  );
};
