# Family API Documentation

**Base URL:** `/api/family`

All endpoints require authentication unless noted otherwise.

---

## Table of Contents

1. [Create Family](#1-create-family)
2. [Update Family](#2-update-family)
3. [Join Family](#3-join-family)
4. [Get Join Status](#4-get-join-status)
5. [Get Join Requests](#5-get-join-requests)
6. [Approve Join Request](#6-approve-join-request)
7. [Reject Join Request](#7-reject-join-request)
8. [Change Member Role](#8-change-member-role)
9. [Leave Family](#9-leave-family)
10. [Kick Member](#10-kick-member)
11. [Last Week Ranking](#11-last-week-ranking)
12. [This Week Ranking](#12-this-week-ranking)
13. [Family Details](#13-family-details)
14. [Family Reward Chart (Public)](#14-family-reward-chart-public)
15. [Admin — Reward Config CRUD](#15-admin--reward-config-crud)
16. [Admin — Support Reward Config](#16-admin--support-reward-config)
17. [Family Support Reward Distribution (Cron)](#17-family-support-reward-distribution-cron)

---

## 1. Create Family

**Endpoint:** `POST /api/family`

**Auth:** Any authenticated user (must be level 5+, no existing family)

**Request Body:**
```json
{
  "name": "Alpha Squad",
  "introduction": "We are the best family!",
  "coverPhoto": "https://...",
  "joinMode": "free",
  "minLevel": 3,
  "memberLimit": 50
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Family name (max 50 chars) |
| `introduction` | string | yes | Family description (max 500 chars) |
| `coverPhoto` | string | no | Cover photo URL |
| `joinMode` | string | yes | `"free"` or `"approval"` |
| `minLevel` | number | no | Minimum user level to join (default 0) |
| `memberLimit` | number | no | Max members (default 1000) |

**Response:**
```json
{
  "success": true,
  "message": "Family created successfully",
  "result": {
    "_id": "...",
    "name": "Alpha Squad",
    "introduction": "We are the best family!",
    "coverPhoto": "https://...",
    "joinMode": "free",
    "minLevel": 3,
    "leaderId": "...",
    "memberCount": 1,
    "memberLimit": 50,
    "totalGifts": 0,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Notes:**
- Creator becomes the leader
- Creating a family costs coins (see `FAMILY_CREATE_PRICE` constant)
- User's `familyId` is set automatically
- A family member document is created with role `"leader"`

---

## 2. Update Family

**Endpoint:** `PUT /api/family`

**Auth:** Family leader only

**Request Body (all fields optional):**
```json
{
  "name": "New Name",
  "introduction": "Updated intro",
  "coverPhoto": "https://...",
  "joinMode": "approval",
  "minLevel": 5,
  "memberLimit": 100
}
```

| Field | Type | Description |
|---|---|---|
| `name` | string | Family name (max 50 chars) |
| `introduction` | string | Family description (max 500 chars) |
| `coverPhoto` | string | Cover photo URL |
| `joinMode` | string | `"free"` or `"approval"` |
| `minLevel` | number | Minimum level to join |
| `memberLimit` | number | Max members |

**Response:**
```json
{
  "success": true,
  "message": "Family updated successfully",
  "result": { ... }
}
```

**Notes:**
- At least one field must be provided
- Updating costs coins (see `FAMILY_UPDATE_PRICE` constant)
- Rate-limited: cannot update more than once per day

---

## 3. Join Family

**Endpoint:** `POST /api/family/join/:familyId`

**Auth:** Any authenticated user (must not already be in a family)

**URL Params:**
| Param | Type | Description |
|---|---|---|
| `familyId` | string | The family to join |

**Response:**
```json
{
  "success": true,
  "message": "Family join request processed",
  "result": {
    "family": { ... },
    "status": "joined"
  }
}
```

**Notes:**
- If `joinMode` is `"free"`, user joins immediately (`status: "joined"`)
- If `joinMode` is `"approval"`, a join request is created (`status: "pending"`)
- User must meet `minLevel` requirement
- User must not already be a member or leader of another family

---

## 4. Get Join Status

**Endpoint:** `GET /api/family/join-status`

**Auth:** Any authenticated user

**Response:**
```json
{
  "success": true,
  "message": "Family join status fetched",
  "result": {
    "status": "joined",
    "familyId": "...",
    "familyName": "Alpha Squad"
  }
}
```

| `status` value | Meaning |
|---|---|
| `"joined"` | User is a member of a family |
| `"pending"` | User has a pending join request |
| `"none"` | User is not in any family |

---

## 5. Get Join Requests

**Endpoint:** `GET /api/family/join-requests`

**Auth:** Family leader/co-leader only

**Response:**
```json
{
  "success": true,
  "message": "Family join requests fetched successfully",
  "result": [
    {
      "_id": "...",
      "userId": { "_id": "...", "name": "John", "avatar": "..." },
      "familyId": "...",
      "status": "pending",
      "createdAt": "..."
    }
  ]
}
```

---

## 6. Approve Join Request

**Endpoint:** `POST /api/family/join-requests/approve/:requestId`

**Auth:** Family leader/co-leader only

**URL Params:**
| Param | Type | Description |
|---|---|---|
| `requestId` | string | The join request ID |

**Response:**
```json
{
  "success": true,
  "message": "Family join request approved",
  "result": { ... }
}
```

**Notes:**
- Creates a family member document for the user
- Updates user's `familyId`
- Increments family `memberCount`

---

## 7. Reject Join Request

**Endpoint:** `POST /api/family/join-requests/reject/:requestId`

**Auth:** Family leader/co-leader only

**URL Params:**
| Param | Type | Description |
|---|---|---|
| `requestId` | string | The join request ID |

**Response:**
```json
{
  "success": true,
  "message": "Family join request rejected",
  "result": { ... }
}
```

---

## 8. Change Member Role

**Endpoint:** `PUT /api/family/member/role/:userId`

**Auth:** Family leader only

**URL Params:**
| Param | Type | Description |
|---|---|---|
| `userId` | string | The member's user ID |

**Request Body:**
```json
{
  "role": "co-leader"
}
```

| `role` value | Description |
|---|---|
| `"leader"` | Family leader (only one allowed) |
| `"co-leader"` | Co-leader |
| `"elder"` | Elder |
| `"member"` | Regular member |

**Response:**
```json
{
  "success": true,
  "message": "Member role updated successfully",
  "result": { ... }
}
```

---

## 9. Leave Family

**Endpoint:** `DELETE /api/family/leave`

**Auth:** Any family member (leader cannot leave — must transfer leadership first)

**Response:**
```json
{
  "success": true,
  "message": "Left family successfully",
  "result": null
}
```

**Notes:**
- Removes the member document
- Sets user's `familyId` to `null`
- Decrements family `memberCount`
- If family becomes empty, `lastEmptyAt` is set

---

## 10. Kick Member

**Endpoint:** `DELETE /api/family/kick/:memberId`

**Auth:** Family leader or co-leader

**URL Params:**
| Param | Type | Description |
|---|---|---|
| `memberId` | string | The member document ID (not the user ID) |

**Response:**
```json
{
  "success": true,
  "message": "Member kicked successfully",
  "result": null
}
```

**Permission Rules:**
- Leader can kick anyone
- Co-leader can kick elders and members
- Co-leader cannot kick another co-leader or the leader
- Cannot kick yourself

---

## 11. Last Week Ranking

**Endpoint:** `GET /api/family/ranking/last-week`

**Auth:** Any authenticated user

**Response:**
```json
{
  "success": true,
  "message": "Last week family ranking fetched successfully",
  "result": {
    "top1FamilyDetails": {
      "familyId": "...",
      "familyName": "Alpha Squad",
      "familyCoverPhoto": "https://...",
      "totalContribution": 50000,
      "leader": {
        "memberId": "...",
        "memberName": "John",
        "memberPhoto": "https://..."
      }
    },
    "ranking": [ ... ]
  }
}
```

**Notes:**
- Ranked by `totalContribution` (sum of `totalCoinCost` from gift records)
- Limited to top 100 families
- Cached for 30 seconds

---

## 12. This Week Ranking

**Endpoint:** `GET /api/family/ranking/this-week`

**Auth:** Any authenticated user

**Response:**
```json
{
  "success": true,
  "message": "This week family ranking fetched successfully",
  "result": {
    "top1FamilyDetails": { ... },
    "weekEnd": "2026-06-28T23:59:59.999Z",
    "ranking": [ ... ]
  }
}
```

**Notes:**
- Same as last week ranking but for the current week
- Includes `weekEnd` field so the frontend can show countdown

---

## 13. Family Details

**Endpoint:** `GET /api/family/details/:familyId`

**Auth:** Any authenticated user

**URL Params:**
| Param | Type | Description |
|---|---|---|
| `familyId` | string | The family ID |

**Response:**
```json
{
  "success": true,
  "message": "Family details fetched successfully",
  "result": {
    "family": {
      "_id": "...",
      "name": "Alpha Squad",
      "introduction": "We are the best family!",
      "coverPhoto": "https://...",
      "joinMode": "free",
      "minLevel": 3,
      "leaderId": "...",
      "memberCount": 45,
      "memberLimit": 50,
      "totalGifts": 50000,
      "createdAt": "...",
      "updatedAt": "..."
    },
    "topContributors": [
      {
        "userId": { "_id": "...", "name": "Alice", "avatar": "..." },
        "role": "member",
        "giftsReceived": 12000
      }
    ],
    "featuredMembers": [
      {
        "userId": { "_id": "...", "name": "Bob", "avatar": "..." },
        "role": "leader"
      }
    ],
    "rewardProgress": {
      "currentWeeklyContribution": 35000,
      "nextLevel": 3,
      "nextLevelTarget": 50000
    },
    "activeRooms": [
      {
        "roomId": "abc123",
        "title": "Chill Zone",
        "roomPhoto": "https://...",
        "hostId": { "_id": "...", "name": "Alice", "avatar": "https://..." },
        "membersCount": 12,
        "isLocked": false,
        "familyMemberCount": 5
      }
    ]
  }
}
```

**`rewardProgress` fields:**

| Field | Type | Description |
|---|---|---|
| `currentWeeklyContribution` | number | Family's total contribution (sum of `totalCoinCost`) for the current week |
| `nextLevel` | number or null | The next reward level the family can reach. If already at max level, returns the max level number |
| `nextLevelTarget` | number or null | The `targetPoints` needed for the next level. If already at max level, returns the max level's target |

**`activeRooms` fields:**

| Field | Type | Description |
|---|---|---|
| `roomId` | string | Unique room identifier |
| `title` | string | Room title |
| `roomPhoto` | string or undefined | Room cover photo URL |
| `hostId` | object or null | Room host's user info (`_id`, `name`, `avatar`) |
| `membersCount` | number | Total number of members in the room |
| `isLocked` | boolean | Whether the room is private (requires password) |
| `familyMemberCount` | number | Number of family members currently in the room |

**Notes:**
- `topContributors`: top 5 members by `giftsReceived` (lifetime), populated with user info
- `featuredMembers`: up to 5 members — leader first, then co-leaders, then regular members
- `rewardProgress`: computed from gift records (current week) and `family_support_rewards` config
- `activeRooms`: up to 5 active audio rooms containing family members, sorted by `familyMemberCount` descending (rooms with the most family members first)

---

## 14. Family Reward Chart (Public)

**Endpoint:** `GET /api/family-rewards/list`

**Auth:** Any authenticated user

**Response:**
```json
{
  "success": true,
  "result": [
    {
      "label": "TOP1 Reward",
      "starRating": 5,
      "rankDisplay": "TOP1",
      "items": [
        {
          "itemId": "...",
          "duration": 30,
          "isExclusive": true
        }
      ]
    },
    {
      "label": "TOP2-3 Reward",
      "starRating": 4,
      "rankDisplay": "TOP2-3",
      "items": [
        {
          "itemId": "...",
          "duration": 14
        }
      ]
    }
  ]
}
```

**Notes:**
- Returns the reward chart configuration for display in the app
- `rankDisplay` is a formatted string like `"TOP1"` or `"TOP4-10"`
- Items are store item references with duration in days

---

## 15. Admin — Reward Config CRUD

### 15a. Get All Reward Configs

**Endpoint:** `GET /api/family-rewards/admin`

**Auth:** Admin, SubAdmin

**Response:** Array of full reward config documents with populated item details.

### 15b. Create Reward Config

**Endpoint:** `POST /api/family-rewards/admin`

**Auth:** Admin, SubAdmin

**Request Body:**
```json
{
  "rank": 1,
  "items": [
    { "itemId": "...", "duration": 30, "isExclusive": true }
  ],
  "starRating": 5,
  "label": "TOP1 Reward"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `rank` | number | no* | Single rank (e.g., `1` for TOP1) |
| `startRank` | number | no* | Start of rank range |
| `endRank` | number | no* | End of rank range |
| `items` | array | yes | Array of store items with duration |
| `starRating` | number | yes | 1-5 star rating for display |
| `label` | string | yes | Display label (e.g., "TOP1 Reward") |

*Either `rank` OR both `startRank` and `endRank` must be provided.

**Notes:**
- Rank ranges cannot overlap with existing configs
- All `itemId` values must exist in the store

### 15c. Update Reward Config

**Endpoint:** `PUT /api/family-rewards/admin/:id`

**Auth:** Admin, SubAdmin

**Request Body:** Same as create, all fields optional.

### 15d. Delete Reward Config

**Endpoint:** `DELETE /api/family-rewards/admin/:id`

**Auth:** Admin, SubAdmin

---

## 16. Admin — Support Reward Config

These endpoints manage the **family support reward levels** — the coin payout configuration that determines how much each family member receives based on the family's weekly ranking performance.

### 16a. Get All Support Reward Levels

**Endpoint:** `GET /api/admin/family-support-rewards`

**Auth:** Admin, SubAdmin

**Response:**
```json
{
  "success": true,
  "message": "Family support rewards fetched successfully",
  "result": [
    {
      "level": 1,
      "targetPoints": 10000,
      "totalBonus": 5000,
      "leaderCut": 1000,
      "top1Cut": 800,
      "top2Cut": 600,
      "top3Cut": 400,
      "top4To10Cut": 200,
      "top11To15Cut": 100,
      "top16To20Cut": 50,
      "minContributionRequired": 1200000
    }
  ]
}
```

### 16b. Get Support Reward by Level

**Endpoint:** `GET /api/admin/family-support-rewards/:level`

**Auth:** Admin, SubAdmin

**URL Params:**
| Param | Type | Description |
|---|---|---|
| `level` | number | Level number (1-10) |

**Response:** Single reward level config object.

### 16c. Update Support Reward by Level

**Endpoint:** `PUT /api/admin/family-support-rewards/:level`

**Auth:** Admin, SubAdmin

**URL Params:**
| Param | Type | Description |
|---|---|---|
| `level` | number | Level number (1-10) |

**Request Body (all fields optional):**
```json
{
  "targetPoints": 15000,
  "totalBonus": 7500,
  "leaderCut": 1500,
  "top1Cut": 1000,
  "top2Cut": 800,
  "top3Cut": 600,
  "top4To10Cut": 300,
  "top11To15Cut": 150,
  "top16To20Cut": 75,
  "minContributionRequired": 1200000
}
```

| Field | Type | Description |
|---|---|---|
| `targetPoints` | number | Total family contribution needed to reach this level |
| `totalBonus` | number | Total coin bonus for this level |
| `leaderCut` | number | Coins awarded to the family leader |
| `top1Cut` | number | Coins awarded to the #1 contributor (non-leader) |
| `top2Cut` | number | Coins awarded to the #2 contributor |
| `top3Cut` | number | Coins awarded to the #3 contributor |
| `top4To10Cut` | number | Coins awarded to each of ranks 4-10 |
| `top11To15Cut` | number | Coins awarded to each of ranks 11-15 |
| `top16To20Cut` | number | Coins awarded to each of ranks 16-20 |
| `minContributionRequired` | number | Minimum individual weekly contribution to qualify for payout |

**Notes:**
- Level must be an integer between 1 and 10
- All values must be non-negative numbers
- At least one field must be provided

---

## 17. Family Support Reward Distribution (Cron)

**Schedule:** Every Sunday at midnight (configured via `FAMILY_SUPPORT_REWARD` cron)

**Not an API endpoint** — this is a background job.

### How It Works

1. Fetches all configured reward levels (sorted by level ascending)
2. Gets last week's family ranking (families with gifts)
3. For each qualifying family:
   - Selects the highest level where `totalContribution >= targetPoints`
   - Checks for duplicate payout (history lookup by family + weekStart)
   - Fetches weekly contributors (top 20 by `totalCoinCost`)
   - Excludes the leader from top contributors (leader gets paid separately)
   - Credits coins to eligible members (must meet `minContributionRequired`)
   - Creates a history record

### Payout Structure

| Role | Payment |
|---|---|
| Leader | `leaderCut` amount (if weekly contribution >= minContributionRequired) |
| Top 1 (non-leader) | `top1Cut` |
| Top 2 (non-leader) | `top2Cut` |
| Top 3 (non-leader) | `top3Cut` |
| Ranks 4-10 | `top4To10Cut` each |
| Ranks 11-15 | `top11To15Cut` each |
| Ranks 16-20 | `top16To20Cut` each |

### Deduplication

- A history record is created per family per week
- If a history record exists for the same `familyId` + `weekStart`, the family is skipped
- If the job crashes after crediting coins but before creating history, double-payment is possible on retry (narrow window)

---

## Enums Reference

### `FamilyJoinMode`
| Value | Description |
|---|---|
| `"free"` | Users join immediately |
| `"approval"` | Requires leader/co-leader approval |

### `FamilyMemberRole`
| Value | Description |
|---|---|
| `"leader"` | Family leader (one per family) |
| `"co-leader"` | Co-leader |
| `"elder"` | Elder |
| `"member"` | Regular member |
