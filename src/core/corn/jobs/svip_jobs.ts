import { SvipService } from "../../../services/svip/svip_service";

/**
 * Runs on the 1st of each month at 00:00 to process SVIP retention/downgrade
 * for all users with SVIP tier > 0.
 *
 * Logic per user:
 *   1. Effective tier = max(tierStartOfMonth, highest milestone reached during month)
 *   2. Check if monthlyRechargeCoins >= 50% × milestoneCoins of effective tier
 *   3. If yes → retain tier
 *   4. If no  → downgrade by 1 (never below 0)
 *   5. Reset monthlyRechargeCoins to 0 for the new month
 */
export const svipMonthlyRetentionJob = async () => {
  console.log("[SVIP Cron] Starting monthly retention check...");

  try {
    const result = await SvipService.runMonthlyRetention();
    console.log(
      `[SVIP Cron] Done. Processed=${result.processed}, Retained=${result.retained}, Downgraded=${result.downgraded}`,
    );
  } catch (error) {
    console.error("[SVIP Cron] Monthly retention job failed:", error);
  }
};
