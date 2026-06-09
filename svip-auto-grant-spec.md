# SVIP Auto-Grant Feature Specification

## 1. Overview

Link the SVIP milestone system (recharge-based tier progression) with the store item system so that users automatically receive the corresponding SVIP store item into their bucket (inventory) with `useStatus: true` when they reach a milestone tier.

Users **can no longer purchase SVIP items** from the store. SVIP items are earned exclusively through monthly recharge milestones.

---

## 2. Data Model Changes

### 2.1 `ISvipTier` — Add `storeItemId`

**File:** `src/models/admin/svip_config_model.ts`

```ts
export interface ISvipTier {
  tier: number;
  milestoneCoins: number;
  storeItemId?: mongoose.Types.ObjectId | null; // 👈 NEW
}
```

Add the field to the schema:
```ts
storeItemId: {
  type: Schema.Types.ObjectId,
  ref: DatabaseNames.StoreItem,
  default: null,
}
```

### 2.2 Default Config — Add `storeItemId: null`

**File:** `src/services/admin/svip_config_service.ts`

All default tiers get `storeItemId: null`.

---

## 3. Auto-Sync: Store Item ↔ SVIP Config

### 3.1 On Create — `createStoreItemBatch()`

**File:** `src/services/store/store_service.ts`

After a batch (premium) store item is successfully created:

1. Check if `item.name` starts with `"SVIP-"` (case-insensitive)
2. If yes, extract the tier number: `"SVIP-3"` → `3`
3. Get the first price from `item.prices[0].price` as the `milestoneCoins`
4. Load the SVIP config via `SvipConfigService.getConfig()`
5. Find the tier in `config.tiers` where `tier.tier === extractedTier`
6. If found:
   - Set `tier.storeItemId = createdItem._id`
   - Set `tier.milestoneCoins = price` (if different — "skip if unchanged")
   - Save via `SvipConfigService.updateConfig()`
7. If no matching tier in config, log a warning but don't throw (admin may need to add the tier first)

**Edge Cases:**
- Item name is "SVIP-abc" → `extractPremiumTier` returns 0 → skip silently
- Item name is "SVIP-0" → skip (tiers start at 1)
- Multiple SVIP items for the same tier → last one wins (overwrites the `storeItemId`)
- Non-SVIP premium items → no action

### 3.2 On Update — `updateStoreItemBatch()`

**File:** `src/services/store/store_service.ts`

After a batch item is updated:

1. Check if the item name starts with `"SVIP-"`
2. If the name changed to/from SVIP → handle accordingly
3. If the price changed → auto-update `milestoneCoins` in config (skip if unchanged)
4. If the item name didn't change and price didn't change → no action

### 3.3 On Delete — `deleteStoreItem()`

**File:** `src/services/store/store_service.ts`

Before or after the item is hard-deleted:

1. Check if the item name starts with `"SVIP-"`
2. Extract tier number
3. Load SVIP config
4. Clear `storeItemId` for that tier (set to `null`)
5. Save via `SvipConfigService.updateConfig()`

### 3.4 Helper Function

Create a shared helper (e.g., `syncSvipConfigWithStoreItem()`) that encapsulates the "check name → extract tier → sync config" logic so it can be reused in create, update, and delete flows.

```ts
async function syncSvipConfigWithStoreItem(
  itemName: string,
  itemId: string | Types.ObjectId,
  price?: number,
  action: 'set' | 'clear' = 'set',
): Promise<void>
```

---

## 4. Auto-Grant: Bucket Management on Milestone Reach

### 4.1 On Tier Upgrade — `SvipService.trackRecharge()`

**File:** `src/services/svip/svip_service.ts`

After the user's tier is upgraded (step 4 in `trackRecharge`):

1. Determine the new tier number
2. Load the SVIP config
3. Find the tier config where `tier.tier === newTier`
4. If `tier.storeItemId` exists:
   a. Find the SVIP category ObjectId (the "SVIP" store category)
   b. Check if user already has a bucket entry in the SVIP category
      - `myBucketRepository.findBucketByOwnerAndCategory(userId, svipCategoryId)`
   c. If yes → **replace** the existing bucket item:
      - Update `itemId` to the new `storeItemId`
      - Set `useStatus: true`
      - Keep or update `expireAt` (no TTL used)
   d. If no → **create** a new bucket entry:
      - `itemId: storeItemId`
      - `ownerId: userObjectId`
      - `categoryId: svipCategoryId`
      - `useStatus: true` ← auto-equipped
      - No expiry/expireAt (managed by cron)
5. If `storeItemId` is null → log a warning (item not linked yet)

**Transaction:** This runs inside the **same transaction** as the coin credit (already the case via `creditRegularUserCoins`).

### 4.2 On First Recharge (Tier 1)

When a user has tier 0 and recharges enough to reach tier 1, the same logic applies — it's just an upgrade from 0 → 1.

### 4.3 Repository Methods Needed

**File:** `src/repository/store/my_bucket_repository.ts`

No new methods needed — `findBucketByOwnerAndCategory()`, `createNewBucket()`, and `updateBucket()` already exist.

---

## 5. Month-End Retention: Bucket Management

### 5.1 On Retention/Downgrade — `SvipService.runMonthlyRetention()`

**File:** `src/services/svip/svip_service.ts`

After the retention check determines the user's new tier:

- **Retained** (tier unchanged): Keep the existing bucket item as-is. No change needed.
- **Downgraded** (e.g., SVIP-5 → SVIP-4):
  1. Look up the new tier's `storeItemId` from config
  2. Update the user's SVIP bucket item to the new `storeItemId`
  3. If the new tier is 0 → delete the bucket item entirely
- **Downgraded to 0**: Delete the user's SVIP bucket entry

Since `bulkResetForNewMonth` already bulk-writes all updates, extend it to also handle bucket updates. However, since bucket operations involve a different collection (`my_bucket_items`), we should handle them separately.

**Implementation approach:**
1. After determining all retention outcomes, collect the bucket operations
2. Execute them in parallel:
   - For retained users: no-op
   - For downgraded users: update bucket item to new `storeItemId` (or delete if tier 0)

### 5.2 No TTL on SVIP Bucket Items

SVIP bucket items do NOT use TTL expiry. Their lifecycle is managed entirely by:
- `trackRecharge()` → on upgrade
- `runMonthlyRetention()` → on retention/downgrade

---

## 6. Block SVIP Purchases

### 6.1 `buyStoreItem()` Guard

**File:** `src/services/store/store_service.ts`

In the `buyStoreItem()` method, add a check **before** the existing premium upgrade logic:

```ts
// Block purchase of SVIP items — earned only via recharge milestones
const itemCategory = await this.CategoryRepository.getCategoryById(
  item.categoryId.toString(),
);
if (itemCategory && itemCategory.title === "SVIP") {
  throw new AppError(
    StatusCodes.BAD_REQUEST,
    "SVIP items can only be earned through monthly recharge milestones, not purchased directly.",
  );
}
```

This check goes right after the existing `canUserBuyThis` guard and before the price validation.

### 6.2 SVIP Items in Store UI

**File:** `src/services/store/store_service.ts` — `getSVIPStoreItems()` and `applyPremiumTierIsBought()`

The `getSVIPStoreItems()` method currently determines `isBought` by looking at the user's bucket items. Since SVIP items are now granted via recharge milestones, the `isBought` logic should reflect the user's milestone-based SVIP tier:

1. Load the user's SVIP record (`UserSvipModel`)
2. Get their `currentTier`
3. Mark items with tier ≤ `currentTier` as `isBought: true`
4. Mark items with tier > `currentTier` as `isBought: false`

The items themselves remain **visible** in the store UI (not hidden). They show "Earned" or "Milestone Reward" status rather than a purchase button.

---

## 7. SVIP Item Display in User Details

### 7.1 `svipItem` in User Responses

**File:** `src/core/Utils/helper_pipelines.ts` and `src/core/Utils/helper_functions.ts`

The existing pipeline and helper functions (`checkBoughtSvip`) look at premium bucket items to extract SVIP item details (name, logo, svgaFile, previewFile). Since SVIP items are now added to the bucket via milestone grants, these should continue to work correctly without modification — the SVIP item will be in the bucket with `useStatus: true`.

### 7.2 `getUserStatus()` SVIP Dashboard

**File:** `src/services/svip/svip_service.ts` — `getUserStatus()`

Consider adding the linked SVIP store item's details (name, logo) to the SVIP dashboard response so the frontend can display which SVIP item the user currently has equipped.

---

## 8. File Change Summary

| File | Change |
|---|---|
| `src/models/admin/svip_config_model.ts` | Add `storeItemId` to `ISvipTier` + schema |
| `src/services/admin/svip_config_service.ts` | Update defaults with `storeItemId: null` |
| `src/services/store/store_service.ts` | Auto-sync on create/update/delete; block SVIP purchases; update `isBought` logic |
| `src/services/svip/svip_service.ts` | Create/update bucket on upgrade; manage bucket on retention/downgrade |
| `src/repository/store/my_bucket_repository.ts` | No new methods needed (existing ones suffice) |
| `src/repository/svip/user_svip_repository.ts` | No changes needed |

---

## 9. Edge Cases & Considerations

| Case | Handling |
|---|---|
| SVIP item created for tier not in config | Log warning, skip sync. Admin must add the tier first |
| Multiple SVIP items for same tier | Last created/updated wins (overwrites `storeItemId`) |
| SVIP item renamed to non-SVIP name | Clear `storeItemId` from config tier |
| Non-SVIP item renamed to SVIP- name | Auto-sync on next update if price present |
| Item deleted while users have it in bucket | Bucket entries remain (orphaned). Cron will clean up on next retention cycle when users get downgraded/upgraded |
| Admin updates SVIP config tiers manually | No auto-sync to store items. Manual config changes take precedence |
| Concurrent recharges | Already handled by `$inc` on `monthlyRechargeCoins` and `currentTier: { $lt: tier }` guard |

---

## 10. Implementation Order

1. Update `ISvipTier` model + defaults
2. Add `syncSvipConfigWithStoreItem()` helper
3. Integrate helper into `createStoreItemBatch()`
4. Integrate helper into `updateStoreItemBatch()`
5. Integrate helper into `deleteStoreItem()`
6. Add SVIP buy-block guard in `buyStoreItem()`
7. Update `trackRecharge()` to create/update bucket on milestone upgrade
8. Update `runMonthlyRetention()` to manage bucket items on downgrade
9. Update `getSVIPStoreItems()` / `applyPremiumTierIsBought()` to use milestone-based `isBought`
10. Add SVIP store item details to `getUserStatus()` dashboard response

---

## 11. Open Questions / Future Considerations

- Should the `selectBucket` (equip/unequip) logic allow manual unequip of an SVIP item? (Currently auto-equipped with `useStatus: true`)
- Should the retention downgrade remove the SVIP item from the bucket immediately or only at month-end?
- Should a notification be sent to the user when they receive a new SVIP tier/item via socket?
