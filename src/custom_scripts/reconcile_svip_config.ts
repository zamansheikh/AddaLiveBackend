import "dotenv/config";
import mongoose from "mongoose";

/**
 * One-time reconcile: for every SVIP-<n> store item, copy its recharge target
 * (prices[0].price) and _id into svip_configs tier <n> as milestoneCoins /
 * storeItemId. Fixes configs that drifted from the admin-set store prices
 * (e.g. app showing the seeded 1M instead of the edited 10K).
 *
 * Read-only preview by default; pass `--apply` to write.
 */
async function main() {
  const apply = process.argv.includes("--apply");
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    console.error("MONGO_URL not set");
    process.exit(1);
  }
  await mongoose.connect(mongoUrl, { family: 4 });
  const db = mongoose.connection.db!;
  console.log(`DB: ${mongoose.connection.name}  mode: ${apply ? "APPLY" : "DRY-RUN"}\n`);

  const cfg = await db.collection("svip_configs").findOne({});
  if (!cfg) {
    console.error("No svip_configs document found.");
    await mongoose.disconnect();
    return;
  }

  const items = await db
    .collection("store_items")
    .find({ name: { $regex: /^SVIP-\d+$/ } })
    .toArray();

  const tiers = (cfg.tiers || []).map((t: any) => ({ ...t }));
  let changes = 0;

  for (const item of items) {
    const m = /^SVIP-(\d+)$/.exec(item.name);
    if (!m) continue;
    const tierNum = Number(m[1]);
    const price = item.prices?.[0]?.price;
    if (typeof price !== "number") {
      console.log(`  SVIP-${tierNum}: no price on item — skipped`);
      continue;
    }
    const tier = tiers.find((t: any) => t.tier === tierNum);
    if (!tier) {
      console.log(`  SVIP-${tierNum}: no matching config tier — skipped`);
      continue;
    }
    const oldCoins = tier.milestoneCoins;
    const oldStore = tier.storeItemId ? tier.storeItemId.toString() : "null";
    const newStore = item._id.toString();
    if (oldCoins !== price || oldStore !== newStore) {
      console.log(
        `  SVIP-${tierNum}: milestoneCoins ${oldCoins} -> ${price} | storeItemId ${oldStore} -> ${newStore}`,
      );
      tier.milestoneCoins = price;
      tier.storeItemId = item._id;
      changes++;
    } else {
      console.log(`  SVIP-${tierNum}: already in sync`);
    }
  }

  console.log(`\n${changes} tier(s) need updating.`);
  if (apply && changes > 0) {
    await db
      .collection("svip_configs")
      .updateOne({ _id: cfg._id }, { $set: { tiers } });
    console.log("✅ svip_configs updated.");
  } else if (!apply && changes > 0) {
    console.log("Run again with --apply to write these changes.");
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
