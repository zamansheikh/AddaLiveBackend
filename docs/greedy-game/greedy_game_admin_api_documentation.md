# Greedy Game Admin API Documentation

The **Greedy Game Admin API** allows Adda platform admins to manage and monitor the Greedy Game (wheel game) integrated into the platform. Adda acts as a **transparent proxy** — all requests are forwarded to the Greedy Game backend with the `x-admin-key` header. Responses are passed back unchanged.

---

## Base URL

```
/api/admin/game
```

Mounted at the Adda backend server.

---

## Authentication

All endpoints require a valid JWT token with role `Admin` or `SubAdmin`.

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <your_jwt_token>` |
| `Content-Type` | `application/json` (for POST/PUT with body) |

---

## 1. Get Game Config

Returns the current RTP and manual result override for the game.

```
GET /api/admin/game/config
```

**Access Control:** `Admin`, `SubAdmin`

**Response (200):**
```json
{
  "gameId": "greedy",
  "config": {
    "rtp": 70,
    "manualResult": null
  }
}
```

**Error Responses:**

| Status | Body |
|--------|------|
| 401 | `{ "error": "Unauthorized" }` |
| 404 | `{ "error": "Game not found" }` |
| 500 | `{ "error": "Internal server error" }` |

---

## 2. Update Game Config

Updates the RTP or sets/clears a manual result override.

```
PUT /api/admin/game/config
```

**Access Control:** `Admin`, `SubAdmin`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rtp` | `number` | No | Return-to-player percentage (0–100) |
| `manualResult` | `string \| null` | No | Force a specific wheel item to win next round, or `null` to clear |

**Valid wheel item IDs:** `carrot`, `corn`, `tomato`, `vegetable`, `hotdog`, `satay`, `pizza`, `steak`

**Example Request:**
```json
{
  "rtp": 85,
  "manualResult": null
}
```

**Response (200):**
```json
{
  "success": true
}
```

**Error Responses:**

| Status | Body |
|--------|------|
| 401 | `{ "error": "Unauthorized" }` |
| 500 | `{ "error": "Internal server error" }` |

---

## 3. Force Round Result

Forces the next round to land on a specific wheel item.

```
POST /api/admin/game/force-result
```

**Access Control:** `Admin`, `SubAdmin`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `itemId` | `string` | Yes | The item to force as winner |

**Example Request:**
```json
{
  "itemId": "pizza"
}
```

**Response (200):**
```json
{
  "success": true,
  "forcedItem": "pizza"
}
```

**Error Responses:**

| Status | Body |
|--------|------|
| 400 | `{ "error": "itemId is required" }` |
| 400 | `{ "error": "Invalid item: <itemId>" }` |
| 401 | `{ "error": "Unauthorized" }` |
| 500 | `{ "error": "Internal server error" }` |

---

## 4. Get Round History

Paginated list of completed rounds with optional date range filtering.

```
GET /api/admin/game/rounds?page=1&limit=20&from=2026-06-01&to=2026-06-14
```

**Access Control:** `Admin`, `SubAdmin`

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `number` | `1` | Page number (1-indexed) |
| `limit` | `number` | `20` | Items per page |
| `from` | `string` (ISO date) | — | Filter rounds on or after this date |
| `to` | `string` (ISO date) | — | Filter rounds on or before this date |

**Response (200):**
```json
{
  "rounds": [
    {
      "roundId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "winningItem": "pizza",
      "totalBets": 25000,
      "totalPayout": 625000,
      "platformProfit": -600000,
      "completedAt": "2026-06-14T12:30:35.000Z",
      "items": [
        { "id": "carrot", "name": "Carrot", "totalBets": 5000, "betCount": 10 },
        { "id": "corn", "name": "Corn", "totalBets": 2000, "betCount": 4 },
        { "id": "tomato", "name": "Tomato", "totalBets": 3000, "betCount": 6 },
        { "id": "vegetable", "name": "Vegetable", "totalBets": 0, "betCount": 0 },
        { "id": "hotdog", "name": "Hotdog", "totalBets": 1000, "betCount": 2 },
        { "id": "satay", "name": "Satay", "totalBets": 0, "betCount": 0 },
        { "id": "pizza", "name": "Pizza", "totalBets": 10000, "betCount": 8 },
        { "id": "steak", "name": "Steak", "totalBets": 4000, "betCount": 3 }
      ]
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 150
}
```

**Error Responses:**

| Status | Body |
|--------|------|
| 400 | `{ "error": "Invalid page or limit" }` |
| 401 | `{ "error": "Unauthorized" }` |
| 500 | `{ "error": "Internal server error" }` |

---

## 5. Get Round Detail

Full detail of a single completed round, including winners.

```
GET /api/admin/game/rounds/:roundId
```

**Access Control:** `Admin`, `SubAdmin`

**Response (200):**
```json
{
  "roundId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "gameId": "greedy",
  "winningItem": "pizza",
  "totalBets": 25000,
  "totalPayout": 625000,
  "platformProfit": -600000,
  "completedAt": "2026-06-14T12:30:35.000Z",
  "items": [
    { "id": "carrot", "name": "Carrot", "totalBets": 5000, "betCount": 10 },
    { "id": "corn", "name": "Corn", "totalBets": 2000, "betCount": 4 },
    { "id": "tomato", "name": "Tomato", "totalBets": 3000, "betCount": 6 },
    { "id": "vegetable", "name": "Vegetable", "totalBets": 0, "betCount": 0 },
    { "id": "hotdog", "name": "Hotdog", "totalBets": 1000, "betCount": 2 },
    { "id": "satay", "name": "Satay", "totalBets": 0, "betCount": 0 },
    { "id": "pizza", "name": "Pizza", "totalBets": 10000, "betCount": 8 },
    { "id": "steak", "name": "Steak", "totalBets": 4000, "betCount": 3 }
  ],
  "winners": [
    { "userId": 42, "betAmount": 5000, "multiplier": 25, "payout": 125000 },
    { "userId": 17, "betAmount": 3000, "multiplier": 25, "payout": 75000 },
    { "userId": 99, "betAmount": 2000, "multiplier": 25, "payout": 50000 }
  ]
}
```

**Error Responses:**

| Status | Body |
|--------|------|
| 401 | `{ "error": "Unauthorized" }` |
| 404 | `{ "error": "Round result not found" }` |
| 500 | `{ "error": "Internal server error" }` |

---

## 6. Get Dashboard Stats

Aggregated game statistics broken down by time periods.

```
GET /api/admin/game/dashboard?from=2026-06-01&to=2026-06-14
```

**Access Control:** `Admin`, `SubAdmin`

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `from` | `string` (ISO date) | — | Start of custom date range (inclusive) |
| `to` | `string` (ISO date) | — | End of custom date range (inclusive) |

**Response (200):**
```json
{
  "gameId": "greedy",
  "totalUsers": 142,
  "activeUsers": 7,
  "today": {
    "totalRounds": 145,
    "totalBets": 350000,
    "totalPayout": 280000,
    "totalProfit": 70000
  },
  "last7Days": {
    "totalRounds": 1020,
    "totalBets": 2450000,
    "totalPayout": 2150000,
    "totalProfit": 300000
  },
  "last30Days": {
    "totalRounds": 4500,
    "totalBets": 9800000,
    "totalPayout": 8700000,
    "totalProfit": 1100000
  }
}
```

When `from` and `to` query parameters are provided, a `customRange` field is also included:

```json
{
  "customRange": {
    "totalRounds": 210,
    "totalBets": 580000,
    "totalPayout": 490000,
    "totalProfit": 90000
  }
}
```

**Each period object contains:**
| Field | Type | Description |
|-------|------|-------------|
| `totalRounds` | `number` | Completed rounds in the period |
| `totalBets` | `number` | Total amount wagered |
| `totalPayout` | `number` | Total amount paid out to winners |
| `totalProfit` | `number` | Platform profit (`totalBets - totalPayout`) |

**Error Responses:**

| Status | Body |
|--------|------|
| 401 | `{ "error": "Unauthorized" }` |
| 500 | `{ "error": "Internal server error" }` |

---

## 7. Search Users

Search for users by userId (numeric query) or username (case-insensitive prefix match).

```
GET /api/admin/game/users/search?q=alice&page=1&limit=20
```

**Access Control:** `Admin`, `SubAdmin`

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | `string` | — | Search query — numeric searches by userId, string searches by username |
| `page` | `number` | `1` | Page number (1-indexed) |
| `limit` | `number` | `20` | Items per page (max 100) |

**Response (200):**
```json
{
  "users": [
    { "userId": 10025, "name": "Alice", "avatar": "https://example.com/avatar.png" },
    { "userId": 10042, "name": "AliceInWheels", "avatar": "https://example.com/avatar2.png" }
  ],
  "page": 1,
  "limit": 20,
  "total": 2
}
```

**Error Responses:**

| Status | Body |
|--------|------|
| 400 | `{ "error": "Query parameter 'q' is required" }` |
| 401 | `{ "error": "Unauthorized" }` |
| 500 | `{ "error": "Internal server error" }` |

---

## 8. Get User Details

Aggregated statistics and activity breakdown for a specific user.

```
GET /api/admin/game/users/:userId/details
```

**Access Control:** `Admin`, `SubAdmin`

**Response (200):**
```json
{
  "userId": 10025,
  "name": "Alice",
  "avatar": "https://example.com/avatar.png",
  "totalParticipatedRounds": 350,
  "totalWinRounds": 132,
  "totalLossRounds": 218,
  "totalBetAmount": 250000,
  "totalWinAmount": 210000,
  "activity": {
    "today": { "bets": 5, "wins": 2, "losses": 3 },
    "thisWeek": { "bets": 35, "wins": 15, "losses": 20 },
    "thisMonth": { "bets": 120, "wins": 55, "losses": 65 }
  }
}
```

**Error Responses:**

| Status | Body |
|--------|------|
| 400 | `{ "error": "Invalid userId" }` |
| 401 | `{ "error": "Unauthorized" }` |
| 404 | `{ "error": "User not found" }` |
| 500 | `{ "error": "Internal server error" }` |

---

## 9. Get User Bet History

Paginated bet history for a specific user.

```
GET /api/admin/game/users/:userId/bets?page=1&limit=20
```

**Access Control:** `Admin`, `SubAdmin`

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `number` | `1` | Page number (1-indexed) |
| `limit` | `number` | `20` | Items per page (max 100) |

**Response (200):**
```json
{
  "bets": [
    {
      "roundId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "timestamp": "2026-06-14T12:30:35.000Z",
      "item": "pizza",
      "betAmount": 1000,
      "multiplier": 25,
      "won": true,
      "payout": 25000
    },
    {
      "roundId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "timestamp": "2026-06-14T12:30:00.000Z",
      "item": "corn",
      "betAmount": 500,
      "multiplier": 5,
      "won": false,
      "payout": 0
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 150
}
```

**Error Responses:**

| Status | Body |
|--------|------|
| 400 | `{ "error": "Invalid userId" }` |
| 400 | `{ "error": "Page exceeds total results" }` |
| 401 | `{ "error": "Unauthorized" }` |
| 500 | `{ "error": "Internal server error" }` |

---

## 10. Get Pause Status

Returns whether the game is currently paused.

```
GET /api/admin/game/pause-status
```

**Access Control:** `Admin`, `SubAdmin`

**Response (200):**
```json
{
  "gameId": "greedy",
  "isPaused": false
}
```

**Error Responses:**

| Status | Body |
|--------|------|
| 401 | `{ "error": "Unauthorized" }` |
| 500 | `{ "error": "Internal server error" }` |

---

## 11. Pause Game

Pauses the game. The current round completes normally (betting closes, result is computed, rewards distributed), but no new round starts until resumed.

```
POST /api/admin/game/pause
```

**Access Control:** `Admin`, `SubAdmin`

**Response (200):**
```json
{
  "gameId": "greedy",
  "status": "paused",
  "pausedAt": "2026-06-19T12:30:00.000Z"
}
```

**Error Responses:**

| Status | Body |
|--------|------|
| 401 | `{ "error": "Unauthorized" }` |
| 500 | `{ "error": "Internal server error" }` |

---

## 12. Resume Game

Resumes a paused game. A new round starts immediately with the normal betting window.

```
POST /api/admin/game/resume
```

**Access Control:** `Admin`, `SubAdmin`

**Response (200):**
```json
{
  "gameId": "greedy",
  "status": "active",
  "resumedAt": "2026-06-19T12:31:00.000Z"
}
```

**Error Responses:**

| Status | Body |
|--------|------|
| 401 | `{ "error": "Unauthorized" }` |
| 500 | `{ "error": "Internal server error" }` |

---

## Error Summary

| Status | Meaning |
|--------|---------|
| 400 | Bad request — missing or invalid parameters, invalid item ID |
| 401 | Missing or invalid JWT token |
| 404 | Game, round, or user not found |
| 500 | Internal server error |
