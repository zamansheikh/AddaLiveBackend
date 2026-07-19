import { ReferralConfigModel } from "../../models/referral/referralConfigModel";

/**
 * Ensure a referral config exists.
 *
 * The referral service is a no-op when no config document exists
 * (`handleRegistrationReferral` returns early on `!config`), which silently
 * disables the whole invite/reward feature. This seeds the single config with
 * the schema defaults on first boot so referrals work out of the box; the
 * amounts are then editable from the admin panel (Settings → Referral Bonus).
 */
export async function seedReferralConfig(): Promise<void> {
  const existing = await ReferralConfigModel.findOne();
  if (existing) return;

  // Schema defaults: inviteReward 1,000,000 / rechargeThreshold 200,000 /
  // rechargeReward 1,000,000 / giftCommissionPercentage 5.
  await ReferralConfigModel.create({});
  console.log("✅ Seeded default referral config");
}
