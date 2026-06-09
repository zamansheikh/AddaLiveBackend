# API Changes — June 9, 2026

This document lists all backend changes that affect the frontend. Only API changes visible to the client are included.

---

## Table of Contents

1. [New: SVIP Milestone System](#1-new-svip-milestone-system)
2. [New: Admin Grant Item Endpoint](#2-new-admin-grant-item-endpoint)
3. [Changed: Store Item Body Format](#3-changed-store-item-body-format)
4. [Changed: Buy Item Request](#4-changed-buy-item-request)
5. [Changed: Store Item Response Shape](#5-changed-store-item-response-shape)
6. [Changed: Store Items List Response — Grouped by Category](#6-changed-store-items-list-response--grouped-by-category)
7. [New Field on Store Items: `canUserBuyThis`](#7-new-field-on-store-items-canuserbuythis)
8. [Changed: User Details Response — New Fields](#8-changed-user-details-response--new-fields)
9. [Changed: Socket Room Messages — New Fields](#9-changed-socket-room-messages--new-fields)
10. [New: SVIP Store Item Auto-Grant](#10-new-svip-store-item-auto-grant)
11. [Changed: SVIP Items No Longer Purchasable](#11-changed-svip-items-no-longer-purchasable)
12. [New: SVIP Status Response — `currentItem` Field](#12-new-svip-status-response--currentitem-field)
13. [New: Admin — SVIP Config Auto-Sync on Store Item Operations](#13-new-admin--svip-config-auto-sync-on-store-item-operations)

---

## 1. New: SVIP Milestone System

SVIP is no longer just a purchasable store item. Users now earn SVIP tiers **automatically** by recharging coins within a calendar month. Tiers are configurable by the admin (currently 9 tiers with milestones from 1M to 110M coins).

### New Endpoints

#### `GET /api/svip/status`
Returns the current user's SVIP dashboard.

**Auth:** Any authenticated user

**Response:**
```json
{
  "status": "success",
  "data": {
    "currentTier": 3,
    "monthlyRechargeCoins": 8500000,
    "tierStartOfMonth": 2,
    "nextMilestone": {
      "tier": 4,
      "milestoneCoins": 15000000
    },
    "progressPercent": 56,
    "retentionStatus": {
      "requiredCoins": 2000000,
      "currentProgress": 8500000,
      "meetsRequirement": true
    },
    "currentItem": {
      "name": "SVIP-3",
      "logo": "https://...",
      "svgaFile": "https://...",
      "previewFile": "https://..."
    }
  }
}
```

| Field | Type | Description |
|---|---|---|
| `currentTier` | number | Current SVIP tier (0 = no SVIP) |
| `monthlyRechargeCoins` | number | Total coins recharged this month |
| `tierStartOfMonth` | number | Tier the user started the month with |
| `nextMilestone` | object or null | Next tier milestone (null if at max tier) |
| `nextMilestone.tier` | number | Next tier number |
| `nextMilestone.milestoneCoins` | number | Coins needed to reach next tier |
| `progressPercent` | number | % progress toward next milestone (0-100) |
| `retentionStatus` | object or null | Retention info (null if tier 0) |
| `retentionStatus.requiredCoins` | number | Coins needed by month end to retain current tier |
| `retentionStatus.currentProgress` | number | Current recharge coins this month |
| `retentionStatus.meetsRequirement` | boolean | Whether they currently meet retention |
| `currentItem` | object | The SVIP store item linked to the user's current tier (see below) |
| `currentItem.name` | string or null | Store item name (e.g. "SVIP-3") |
| `currentItem.logo` | string or null | Logo image URL |
| `currentItem.svgaFile` | string or null | SVGA animation URL |
| `currentItem.previewFile` | string or null | Preview image URL |

If the user has no SVIP tier or no store item is linked, `currentItem` is:
```json
{ "name": null, "logo": null, "svgaFile": null, "previewFile": null }
```

#### `GET /api/svip/status/:userId`
Same as above, but for any user. Admin only.

---

## 2. New: Admin Grant Item Endpoint

Admins can now grant exclusive store items to users without requiring a purchase.

#### `POST /api/store/items/grant`

**Auth:** Admin, SubAdmin

**Request Body:**
```json
{
  "itemId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "validity": 30
}
```

| Field | Type | Description |
|---|---|---|
| `itemId` | string (MongoDB ObjectId) | The store item to grant |
| `userId` | string (UUID) | Target user's numeric userId |
| `validity` | number | Duration in days the item will be valid |

**Response:** Same as a normal bucket item.

---

## 3. Changed: Store Item Body Format

Store items no longer accept `validity` and `price` as separate fields.  
They now use a `prices` array supporting **multiple pricing options** per item.  
Items can also have an optional `privilege` array and `logo` file.

### Affected Endpoints

| Endpoint | Method |
|---|---|
| `/api/store/items/single` | POST |
| `/api/store/items/batch` | POST |
| `/api/store/items/single/:id` | PUT |
| `/api/store/items/batch/:id` | PUT |

### New Request Body Shape

**Before (removed):**
```json
{
  "name": "VIP-1",
  "validity": 30,
  "categoryId": "...",
  "price": 500
}
```

**After (new):**
```json
{
  "name": "VIP-1",
  "categoryId": "...",
  "prices": [
    { "validity": 30, "price": 500 },
    { "validity": 90, "price": 1200 }
  ],
  "privilege": ["create_room", "custom_badge"]
}
```

| Field | Type | Description |
|---|---|---|
| `prices` | array | Array of pricing options, each with `validity` (days) and `price` (coins) |
| `privilege` | string[] (optional) | Array of privilege strings the item grants |
| `logo` | file (optional) | Upload a logo file with field name `logo` |

For `single` endpoints: `svgaFile` and `previewFile` are still required.
For `batch` endpoints: `prices` and `privilege` can be sent as JSON strings (multipart parsing).

**VIP/SVIP name validation:**
- Names starting with `VIP` or `SVIP` must have a valid level suffix: `-1` or `-2`  
  (e.g., `VIP-1`, `SVIP-2`)
- Valid levels are `1` and `2` only

---

## 4. Changed: Buy Item Request

#### `POST /api/store/bucket`

**New optional field:** `priceIndex`

**Request Body:**
```json
{
  "itemId": "...",
  "priceIndex": 0
}
```

| Field | Type | Description |
|---|---|---|
| `priceIndex` | number (optional) | Index into the item's `prices` array. Defaults to `0` |

This lets users choose which pricing option they want (e.g., 30-day vs 90-day).

---

## 5. Changed: Store Item Response Shape

Item objects returned by any store endpoint now use the new `prices` array format instead of single `price`/`validity`.

### Affected Endpoints

| Endpoint | Method |
|---|---|
| `/api/store/items/:id` | GET |
| `/api/store/items/category/:category` | GET |
| `/api/store/items/vip` | GET |
| `/api/store/items/svip` | GET |
| `/api/store/items` | GET |

### Response Shape Change

**Before (removed):**
```json
{
  "name": "VIP-1",
  "validity": 30,
  "price": 500,
  "isPremium": true
}
```

**After (new):**
```json
{
  "name": "VIP-1",
  "logo": "https://...",
  "prices": [
    { "validity": 30, "price": 500 },
    { "validity": 90, "price": 1200 }
  ],
  "privilege": ["create_room"],
  "isPremium": true,
  "canUserBuyThis": true
}
```

| New/Changed Field | Type | Description |
|---|---|---|
| `prices` | array | Array of `{ validity, price }` options |
| `privilege` | string[] (optional) | Privileges this item grants |
| `logo` | string or null (optional) | URL to the item's logo image |
| `canUserBuyThis` | boolean | Whether this item can be purchased from the store. `false` = grant-only exclusive item |

---

## 6. Changed: Store Items List Response — Grouped by Category

#### `GET /api/store/items`

**Response shape changed.** It now returns items **grouped by category name** instead of paginated by a single category.

**Before (removed):**
```json
{
  "pagination": { "page": 1, "limit": 20 },
  "items": [ ... ]
}
```

**After (new):**
```json
{
  "Vip": [ ... ],
  "Svip": [ ... ],
  "Background": [ ... ],
  "Text Bubble": [ ... ]
}
```

The response is a single object where each key is a category title and the value is an array of items in that category. Non-premium categories are included.

---

## 7. New Field on Store Items: `canUserBuyThis`

Store items now have a `canUserBuyThis` field. Items with `canUserBuyThis: false` are **grant-only** — they cannot be purchased through the normal buy flow and should not show a "Buy" button in the store UI.

These items are delivered exclusively via the admin grant endpoint (`POST /api/store/items/grant`).

---

## 8. Changed: User Details Response — New Fields

> **Note:** These fields were added in a previous update but are documented here for completeness if the frontend hasn't integrated them yet.

### Affected Endpoints

| Endpoint | Method |
|---|---|
| `/api/auth/my-details` | GET |
| `/api/auth/user/:id` | GET |

### New Fields in Response

The user object now includes `svipItem` and `vipItem` fields indicating which SVIP/VIP store items the user has purchased.

```json
{
  "_id": "...",
  "name": "John",
  "avatar": "...",
  "svipItem": {
    "name": "SVIP-2",
    "logo": "https://...",
    "svgaFile": "https://...",
    "previewFile": "https://..."
  },
  "vipItem": {
    "name": "VIP-1",
    "logo": "https://...",
    "svgaFile": "https://...",
    "previewFile": "https://..."
  }
}
```

| Field | Type | Description |
|---|---|---|
| `svipItem` | object (always present) | The user's purchased SVIP store item (first one found) |
| `vipItem` | object (always present) | The user's purchased VIP store item (first one found) |
| `*.name` | string or null | e.g. `"SVIP-2"` |
| `*.logo` | string or null | Logo URL |
| `*.svgaFile` | string or null | SVGA animation URL |
| `*.previewFile` | string or null | Preview image URL |

If the user has no purchased SVIP/VIP item, all inner fields will be `null`:
```json
{
  "svipItem": { "name": null, "logo": null, "svgaFile": null, "previewFile": null },
  "vipItem": { "name": null, "logo": null, "svgaFile": null, "previewFile": null }
}
```

---

## 9. Changed: Socket Room Messages — New Fields

> **Note:** These fields were added in a previous update but are documented here for completeness.

### `IRoomMessage` — Sent via `AudioRoomChannels.AudioRoomMessage`

Messages now carry optional `svipItem` and `vipItem` data for the sender.

```json
{
  "senderId": "...",
  "senderName": "...",
  "senderAvatar": "...",
  "text": "Hello!",
  "equippedStoreItems": { ... },
  "svipItem": {
    "name": "SVIP-2",
    "logo": "https://..."
  },
  "vipItem": {
    "name": "VIP-1",
    "logo": "https://..."
  }
}
```

### `IMemberDetails` — Sent during room join/seat updates

Same new fields:

```json
{
  "_id": "...",
  "name": "...",
  "avatar": "...",
  "equippedStoreItems": { ... },
  "svipItem": { "name": "...", "logo": "..." },
  "vipItem": { "name": "...", "logo": "..." }
}
```

These fields will always be present as objects (never undefined), but their inner fields may be `null` if the user hasn't purchased anything.

---

## 10. New: SVIP Store Item Auto-Grant

When a user reaches an SVIP milestone via recharge, the corresponding SVIP store item is **automatically added to their inventory (bucket)** with `useStatus: true` (equipped).

### How It Works

1. User recharges coins → `creditRegularUserCoins()` is called
2. `trackRecharge()` increments `monthlyRechargeCoins` and checks milestone thresholds
3. If a milestone is crossed (tier upgrade), the system:
   - Updates the user's SVIP tier
   - Places the linked SVIP store item into their bucket with `useStatus: true`
4. On next `GET /api/svip/status`, the user sees their tier and the `currentItem` with the store item's visual assets

### Upgrade Handling

- **New SVIP user** (tier 0 → tier 1): Creates a fresh bucket entry for the SVIP-1 item
- **Existing SVIP user upgrading** (e.g., tier 2 → tier 5): Replaces the old bucket item with the new higher-tier item
- **Retention** (month-end): If the user retains their tier, the bucket item stays. If they downgrade, the bucket item is updated to the lower-tier item. If they drop to tier 0, the SVIP bucket item is removed entirely.

### What This Means for the Frontend

- The `svipItem` field in user details (`/api/auth/my-details`, `/api/auth/user/:id`) is populated automatically from the bucket item — no front-end changes needed
- The `svipItem` in socket room messages is also populated automatically
- The user's equipped store items (from `GET /api/store/bucket`) will include the SVIP item with `useStatus: true`

---

## 11. Changed: SVIP Items No Longer Purchasable

SVIP store items can **no longer be purchased** directly from the store. They are earned exclusively through monthly recharge milestones.

### Affected Endpoint

| Endpoint | Method | Change |
|---|---|---|
| `/api/store/bucket` | POST | Now rejects purchases of items in the "SVIP" category |

### Behavior

Attempting to buy an SVIP item returns:

```json
{
  "status": "error",
  "message": "SVIP items can only be earned through monthly recharge milestones, not purchased directly."
}
```

### What This Means for the Frontend

- SVIP items remain **visible** in the store UI (they appear in `GET /api/store/items/svip`)
- Items earned via recharge milestones show `isBought: true` — all tiers ≤ the user's current tier are marked as bought
- Items the user hasn't reached yet show `isBought: false`
- The "Buy" button should **not** be shown for SVIP items. Instead, show the user's current milestone progress and which tier they need to reach to unlock the item

---

## 12. New: SVIP Status Response — `currentItem` Field

The `GET /api/svip/status` endpoint now includes a `currentItem` field with the SVIP store item's visual assets.

### New Field

```json
{
  "status": "success",
  "data": {
    "currentTier": 3,
    "currentItem": {                          // 👈 NEW
      "name": "SVIP-3",
      "logo": "https://...",
      "svgaFile": "https://...",
      "previewFile": "https://..."
    },
    "monthlyRechargeCoins": 8500000,
    "tierStartOfMonth": 2,
    "nextMilestone": { "tier": 4, "milestoneCoins": 15000000 },
    "progressPercent": 56,
    "retentionStatus": {
      "requiredCoins": 2000000,
      "currentProgress": 8500000,
      "meetsRequirement": true
    }
  }
}
```

See [section 1](#1-new-svip-milestone-system) for the full field reference.

---

## 13. New: Admin — SVIP Config Auto-Sync on Store Item Operations

When an admin creates, updates, or deletes a **batch (premium) store item** whose name starts with `"SVIP-"`, the SVIP tier configuration is automatically synchronized.

### On Create — `POST /api/store/items/batch`

When a batch item is created with a name like `"SVIP-3"`:

1. The system extracts the tier number from the name (`"SVIP-3"` → tier 3)
2. It reads the first price from the item's `prices` array as the milestone coin threshold
3. It updates the SVIP config tier with the item's `_id` reference and milestone
4. If the tier doesn't exist in the config, a warning is logged (admin must add the tier first)

### On Update — `PUT /api/store/items/batch/:id`

When an SVIP batch item is updated:

- **Price changed**: The milestone coin threshold in the config is updated (only if the price actually changed)
- **Name changed to non-SVIP**: The config reference is cleared (set to `null`)
- **Name changed to a different SVIP tier**: The config reference is updated

### On Delete — `DELETE /api/store/items/:id`

When an SVIP batch item is deleted:
- The config tier's `storeItemId` is set to `null`
- The tier milestone remains in the config (the tier itself is not removed)

### What This Means for the Admin Panel

- **Creating SVIP store items**: Create a batch item with name `"SVIP-3"` and price `8000000`. The SVIP config tier 3 automatically links to this item.
- **Updating prices**: Change the price on an SVIP item → the milestone threshold updates automatically
- **Deleting SVIP items**: The config reference is cleared gracefully
- **Manual config overrides**: Admin can still use `GET/PUT /api/svip/config` to set tiers manually — this takes precedence

### Configuration Model

The SVIP config now stores for each tier:

```json
{
  "tier": 3,
  "milestoneCoins": 8000000,
  "storeItemId": "64f1a2b3c4d5e6f7a8b9c0d1"
}
```

- `storeItemId` is `null` until an admin creates the corresponding SVIP store item
- The auto-grant system checks `storeItemId` when granting items on milestone reach — if `null`, the tier is upgraded but no item is granted
