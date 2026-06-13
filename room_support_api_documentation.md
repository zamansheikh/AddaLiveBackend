# Room Support System — API Documentation

> Comprehensive reference for all APIs related to the Room Support feature, including user-facing endpoints and admin management endpoints.

---

## Table of Contents

1. [Overview](#overview)
2. [User-Facing APIs (Room Support)](#user-facing-apis)
   - [Get Room Support Details](#1-get-room-support-details)
   - [Get Room Partners](#2-get-room-partners)
   - [Add Room Partner](#3-add-room-partner)
   - [Remove Room Partner](#4-remove-room-partner)
3. [Admin APIs (Room Level Criteria)](#admin-apis)
   - [Get All Level Criteria](#5-get-all-level-criteria)
   - [Create or Update Level Criteria](#6-create-or-update-level-criteria)
   - [Delete Level Criteria](#7-delete-level-criteria)
4. [Internal System Processes](#internal-system-processes)
   - [Weekly Reward Distribution (Cron Job)](#weekly-reward-distribution-cron-job)
   - [Auto Level-Up Mechanism](#auto-level-up-mechanism)
5. [Data Models](#data-models)
6. [Level Criteria Reference](#level-criteria-reference)
7. [Route Mounting Summary](#route-mounting-summary)

---

## Overview

The Room Support system tracks engagement metrics for audio rooms (unique visitors and transaction volume). Rooms level up automatically when they meet criteria thresholds, unlocking **room partner slots** that split weekly rewards with the room host.

**Base Paths:**
- User-facing: `/api/room-support`
- Room Level Criteria (read): `/api/admin/room-level-criteria`
- Admin (write): `/api/admin/room-level-criteria`

**Authentication:**
- User-facing endpoints require a valid user JWT token (`authenticate()` middleware).
- The GET endpoint for room level criteria now accepts **any authenticated user** (not just admins), so clients can fetch level requirements and rewards.
- POST and DELETE endpoints require Admin or SubAdmin role (`authenticate([UserRoles.Admin, UserRoles.SubAdmin])` middleware).

---

## User-Facing APIs

### 1. Get Room Support Details

Fetches the current week's support metrics and the previous week's history for a room.

- **URL**: `/api/room-support/:roomId`
- **Method**: `GET`
- **Auth Required**: Yes (user token)
- **URL Params**: `roomId` (string) — The unique identifier of the audio room

#### Success Response

**Code**: `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Room support details fetched successfully",    "result": {
    "thisWeek": {
      "roomId": "663f7a2b1f4e3c001a2b3c4e",
      "numberOfUniqueUsers": 12,
      "roomTransaction": 3500000,
      "roomLevel": 1
    },
    "lastWeek": {
      "roomId": "663f7a2b1f4e3c001a2b3c4e",
      "numberOfUniqueUsers": 8,
      "roomTransaction": 2100000,
      "roomLevel": 0
    },
    "nextCalculationTime": "2026-06-14T00:00:00.000Z",
    "cronSchedule": "0 0 * * *"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `thisWeek.numberOfUniqueUsers` | number | Count of unique users who visited this week |
| `thisWeek.roomTransaction` | number | Total transaction volume this week (in coin units) |
| `thisWeek.roomLevel` | number | Current room support level |
| `lastWeek.*` | number | Snapshot of metrics from the previous week (0 if no history) |
| `nextCalculationTime` | string (ISO date) | The next date/time when the room support reward calculation will run |
| `cronSchedule` | string | The cron expression for the reward calculation schedule (e.g., `"0 0 * * *"`) |

#### Error Responses

**Code**: `400 Bad Request` — Missing `roomId` parameter.

---

### 2. Get Room Partners

Retrieves all partners assigned to a room with their profile details.

- **URL**: `/api/room-support/:roomId/partners`
- **Method**: `GET`
- **Auth Required**: Yes (user token)
- **URL Params**: `roomId` (string)

#### Success Response

**Code**: `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Room partners fetched successfully",
  "result": [
    {
      "_id": "664a1b2c3d4e5f6a7b8c9d0e",
      "name": "JohnDoe",
      "avatar": "https://cdn.example.com/avatars/user123.jpg",
      "uid": "USR001",
      "userId": 1001,
      "country": "US",
      "currentBackground": "level5_bg",
      "currentTag": "gold_vip",
      "currentLevel": 12,
      "equippedStoreItems": {
        "hat": "item_id_1",
        "glasses": "item_id_2"
      }
    }
  ]
}
```

---

### 3. Add Room Partner

Adds a user as a partner to a room. The room must be at least Level 1, and the partner slot count must not be exceeded.

- **URL**: `/api/room-support/:roomId/partners/:partnerId`
- **Method**: `POST`
- **Auth Required**: Yes (user token)
- **URL Params**:
  - `roomId` (string) — Room identifier
  - `partnerId` (string) — User identifier to add as partner

#### Success Response

**Code**: `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Room partner added successfully",
  "result": {
    "roomId": "663f7a2b1f4e3c001a2b3c4e",
    "uniqueUsers": ["...", "..."],
    "roomTransaction": 3500000,
    "roomLevel": 1,
    "roomPartners": ["664a1b2c3d4e5f6a7b8c9d0e"]
  }
}
```

#### Error Responses

| Code | Message | Reason |
|------|---------|--------|
| `400` | `roomId is not valid` | Room ID does not exist |
| `400` | `partnerId is not valid` | Partner user does not exist |
| `400` | `room partner is not available` | Room is Level 0 (not eligible for partners) |
| `400` | `Invalid room level criteria` | Level criteria config not found |
| `400` | `already enough rooom partner` | Partner slots are full for this level |
| `400` | `user is already a partner of this room` | Duplicate partner |

---

### 4. Remove Room Partner

Removes a user from a room's partner list.

- **URL**: `/api/room-support/:roomId/partners/:partnerId`
- **Method**: `DELETE`
- **Auth Required**: Yes (user token)
- **URL Params**:
  - `roomId` (string) — Room identifier
  - `partnerId` (string) — User identifier to remove

#### Success Response

**Code**: `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Room partner removed successfully",
  "result": {
    "roomId": "663f7a2b1f4e3c001a2b3c4e",
    "uniqueUsers": ["..."],
    "roomTransaction": 3500000,
    "roomLevel": 1,
    "roomPartners": []
  }
}
```

#### Error Responses

| Code | Message | Reason |
|------|---------|--------|
| `400` | `roomId is not valid` | Room ID does not exist |
| `400` | `user is not a partner of this room` | User is not currently a partner |

---

## Room Level Criteria APIs

### 5. Get All Level Criteria

Retrieves all configured room support level criteria, sorted by level number.

- **URL**: `/api/admin/room-level-criteria`
- **Method**: `GET`
- **Auth Required**: Yes (any authenticated user — no longer restricted to Admin/SubAdmin)

#### Success Response

**Code**: `200 OK`

```json
{
  "status": "success",
  "data": [
    {
      "_id": "664a1b2c3d4e5f6a7b8c9d0e",
      "level": 1,
      "roomVisitor": 2,
      "roomTransactions": 3000000,
      "totalRewardCoin": 420000,
      "ownerCoin": 330000,
      "partnerCoin": 90000,
      "numberOfPartners": 1,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "_id": "664a1b2c3d4e5f6a7b8c9d0f",
      "level": 2,
      "roomVisitor": 5,
      "roomTransactions": 6000000,
      "totalRewardCoin": 900000,
      "ownerCoin": 660000,
      "partnerCoin": 120000,
      "numberOfPartners": 2,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Admin APIs

---

### 6. Create or Update Level Criteria

Creates a new level criteria or updates an existing one (upsert). Changes are synchronized to the in-memory cache immediately — no server restart required.

- **URL**: `/api/admin/room-level-criteria`
- **Method**: `POST`
- **Auth Required**: Yes (Admin or SubAdmin)
- **Body** (JSON):

```json
{
  "level": 5,
  "roomVisitor": 150,
  "roomTransactions": 27000000,
  "totalRewardCoin": 3880000,
  "ownerCoin": 2800000,
  "partnerCoin": 270000,
  "numberOfPartners": 4
}
```

#### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `level` | number | **Yes** | Level number (1–24) — unique identifier |
| `roomVisitor` | number | Yes | Minimum unique visitors required to reach this level |
| `roomTransactions` | number | Yes | Minimum transaction volume required (in coin units) |
| `totalRewardCoin` | number | Yes | Total weekly reward pool for this level |
| `ownerCoin` | number | Yes | Coins distributed to the room host weekly |
| `partnerCoin` | number | Yes | Coins distributed to each partner weekly |
| `numberOfPartners` | number | Yes | Maximum number of partners allowed at this level |

#### Success Response

**Code**: `200 OK`

```json
{
  "status": "success",
  "data": {
    "_id": "664a1b2c3d4e5f6a7b8c9d10",
    "level": 5,
    "roomVisitor": 150,
    "roomTransactions": 27000000,
    "totalRewardCoin": 3880000,
    "ownerCoin": 2800000,
    "partnerCoin": 270000,
    "numberOfPartners": 4
  }
}
```

> **Note:** After a successful upsert, all services immediately use the updated configuration via the in-memory synchronized array (`ROOM_LEVEL_CRITERIA`).

---

### 7. Delete Level Criteria

Removes a specific level configuration from the system and syncs changes in-memory.

- **URL**: `/api/admin/room-level-criteria/:level`
- **Method**: `DELETE`
- **Auth Required**: Yes (Admin or SubAdmin)
- **URL Params**: `level` (number) — The level number to delete (e.g., `/5`)

#### Success Response

**Code**: `200 OK`

```json
{
  "status": "success",
  "data": {
    "_id": "664a1b2c3d4e5f6a7b8c9d10",
    "level": 5,
    "roomVisitor": 150,
    "roomTransactions": 27000000,
    "totalRewardCoin": 3880000,
    "ownerCoin": 2800000,
    "partnerCoin": 270000,
    "numberOfPartners": 4
  }
}
```

If the level does not exist, the response returns `data: null`.

---

## Internal System Processes

### Weekly Reward Distribution (Cron Job)

- **Schedule**: Runs daily at midnight (`0 0 * * *`) — defined in `src/core/config/cron_schedules.ts` as `ROOM_SUPPORT`
- **Schedule Source**: All cron expressions are now centralized in `src/core/config/cron_schedules.ts` and accessed via `getCronSchedule()`. See the [Cron Schedule Configuration](#cron-schedule-configuration) section below.
- **Timing Service**: The `RoomSupportTimingService` (in `src/services/audio_room/room_support_timing_service.ts`) provides the schedule string and calculates the next run time, which is exposed via the `GET /:roomId` API response.
- **Logic**:
  1. Fetches all rooms with `roomLevel >= 1`
  2. For each room, looks up the host and distributes `ownerCoin` from the level criteria
  3. Distributes `partnerCoin` to each partner
  4. Creates a **Room Support History** snapshot (unique users, transactions, level) for the week
- **Batch Processing**: Rewards are processed in batches of 100 for stability
- **Error Handling**: Individual room failures are logged and do not block other rooms

### Auto Level-Up Mechanism

When a user visits or a transaction occurs in a room, the system:

1. **Unique visitor**: Added via `$addToSet` on the room's `uniqueUsers` array (duplicates ignored)
2. **Transaction**: Increments `roomTransaction` by the gifted amount
3. **Level-up check**: After each update, the level criteria for the *current* level is checked:
   - If `roomTransaction >= criteria.roomTransactions` **AND** `uniqueUsers.length >= criteria.roomVisitor`
   - The room's `roomLevel` is incremented by 1

This mechanism is handled by the `AudioRoomHelper` class, which is called from room entry and gift events.

---

## Data Models

### RoomSupport (`room_supports` collection)

| Field | Type | Description |
|-------|------|-------------|
| `roomId` | string | Unique room identifier (indexed) |
| `uniqueUsers` | ObjectId[] | Set of unique user IDs who visited (via `$addToSet`) |
| `roomTransaction` | number | Cumulative transaction volume (default: `0`) |
| `roomLevel` | number | Current support level (default: `0`) |
| `roomPartners` | ObjectId[] | Array of partner user IDs |
| `createdAt` | Date | Auto-managed timestamp |
| `updatedAt` | Date | Auto-managed timestamp |

### RoomSupportHistory (`room_support_histories` collection)

| Field | Type | Description |
|-------|------|-------------|
| `roomId` | string | Room identifier (unique) |
| `numberOfUniqueUsers` | number | Snapshot of unique visitor count |
| `roomTransaction` | number | Snapshot of transaction volume |
| `roomLevel` | number | Snapshot of room level |
| `createdAt` | Date | Auto-managed timestamp |
| `updatedAt` | Date | Auto-managed timestamp |

### RoomLevelCriteria (`room_level_criteria` collection)

| Field | Type | Description |
|-------|------|-------------|
| `level` | number | Level number (unique, indexed) |
| `roomVisitor` | number | Required unique visitors |
| `roomTransactions` | number | Required transaction volume |
| `totalRewardCoin` | number | Total weekly reward pool |
| `ownerCoin` | number | Coins for room host |
| `partnerCoin` | number | Coins per partner |
| `numberOfPartners` | number | Max partner slots |
| `createdAt` | Date | Auto-managed timestamp |
| `updatedAt` | Date | Auto-managed timestamp |

---

## Level Criteria Reference

These are the **default** values configured in `src/core/Utils/constants.ts`. They can be overridden at runtime via the Admin API (`POST /api/admin/room-level-criteria`).

| Level | Visitors | Transactions (coins) | Total Reward | Owner | Partner | Max Partners |
|------:|---------:|---------------------:|-------------:|------:|--------:|:------------:|
| 1 | 2 | 3,000,000 | 420,000 | 330,000 | 90,000 | 1 |
| 2 | 5 | 6,000,000 | 900,000 | 660,000 | 120,000 | 2 |
| 3 | 7 | 12,000,000 | 1,810,000 | 1,300,000 | 170,000 | 3 |
| 4 | 100 | 18,000,000 | 2,720,000 | 2,000,000 | 240,000 | 3 |
| 5 | 150 | 27,000,000 | 3,880,000 | 2,800,000 | 270,000 | 4 |
| 6 | 200 | 36,000,000 | 5,040,000 | 3,600,000 | 360,000 | 4 |
| 7 | 250 | 45,000,000 | 6,350,000 | 4,300,000 | 410,000 | 5 |
| 8 | 300 | 60,000,000 | 8,100,000 | 5,700,000 | 480,000 | 5 |
| 9 | 350 | 90,000,000 | 11,550,000 | 8,500,000 | 610,000 | 5 |
| 10 | 400 | 120,000,000 | 15,060,000 | 11,100,000 | 660,000 | 6 |
| 11 | 450 | 180,000,000 | 21,670,000 | 16,000,000 | 945,000 | 6 |
| 12 | 500 | 240,000,000 | 28,800,000 | 20,400,000 | 1,200,000 | 7 |
| 13 | 600 | 360,000,000 | 42,800,000 | 30,200,000 | 1,800,000 | 7 |
| 14 | 800 | 480,000,000 | 56,400,000 | 37,200,000 | 2,400,000 | 8 |
| 15 | 1000 | 780,000,000 | 90,000,000 | 54,900,000 | 3,900,000 | 9 |
| 16 | 1200 | 1,140,000,000 | 129,600,000 | 75,600,000 | 5,400,000 | 10 |
| 17 | 1400 | 1,560,000,000 | 174,000,000 | 94,800,000 | 7,200,000 | 11 |
| 18 | 1700 | 2,100,000,000 | 229,800,000 | 121,800,000 | 9,000,000 | 12 |
| 19 | 2000 | 2,400,000,000 | 283,200,000 | 144,000,000 | 11,600,000 | 12 |
| 20 | 2000 | 3,000,000,000 | 376,800,000 | 186,000,000 | 15,900,000 | 12 |
| 21 | 2500 | 3,900,000,000 | 468,000,000 | 234,000,000 | 18,000,000 | 13 |
| 22 | 2500 | 5,100,000,000 | 605,000,000 | 306,000,000 | 23,000,000 | 13 |
| 23 | 3000 | 6,600,000,000 | 780,400,000 | 382,800,000 | 28,400,000 | 14 |
| 24 | 3000 | 9,000,000,000 | 1,045,800,000 | 504,000,000 | 38,700,000 | 14 |

---

## Cron Schedule Configuration

All recurring job schedules are centralized in `src/core/config/cron_schedules.ts`:

```typescript
export const CRON_SCHEDULES = {
  ROOM_XP: "0 0 * * *",           // Daily at midnight — XP tracking reset
  ROOM_SUPPORT: "0 0 * * *",      // Daily at midnight — Room support reward calculation
  MAGIC_BALL: "0 0 * * *",       // Daily at midnight — Magic ball reset
  SVIP_MONTHLY: "0 0 1 * *",     // 1st of every month — SVIP retention check
};
```

Schedules are consumed via the helper:
```typescript
import { getCronSchedule } from "../../core/config/cron_schedules";
cronManager.register(getCronSchedule("ROOM_SUPPORT"), roomSupportRewardSystem);
```

The `RoomSupportTimingService` exposes the `ROOM_SUPPORT` schedule and computes the next calculation time dynamically.

---

## Route Mounting Summary

```
/api/room-support
  GET    /:roomId                       → getMyRoomSupportDetails
  GET    /:roomId/partners              → getMyRoomPartners
  POST   /:roomId/partners/:partnerId   → addRoomPartners
  DELETE /:roomId/partners/:partnerId   → removeRoomPartners

/api/admin/room-level-criteria
  GET    /                              → getAllLevels      (any authenticated user)
  POST   /                              → upsertLevel       (Admin / SubAdmin only)
  DELETE /:level                        → deleteLevel       (Admin / SubAdmin only)
```

The Room Level Criteria router is mounted in `src/server.ts`:
```typescript
app.use("/api/admin/room-level-criteria", RoomLevelCriteriaRouter);
```

The Room Level Criteria in-memory array is bootstrapped from the database at server startup:
```typescript
await RoomLevelCriteriaService.bootstrap();
```
