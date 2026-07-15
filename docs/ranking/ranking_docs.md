# Ranking APIs

This document describes the ranking APIs for user and room leaderboards based on gift transactions.

## Base URL

```
/api/ranking
```

## Authentication

All ranking endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

## Common Response Structure

All endpoints return responses in the following format:

```json
{
  "success": true,
  "statusCode": 200,
  "result": {
    "ranking": [...],
    "myRanking": {...}
  }
}
```

## Periods

All ranking endpoints accept a `period` query parameter with the following values:

| Value | Description |
|-------|-------------|
| `daily` | Current day (00:00 to 23:59) |
| `weekly` | Current week (Monday to Sunday) |
| `monthly` | Current month (1st to last day) |

---

## 1. Get Sender Ranking

Returns the top 100 gift senders ranked by total coins spent.

### Endpoint

```
GET /api/ranking/sender?period={period}
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | Yes | Time period: `daily`, `weekly`, or `monthly` |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "result": {
    "ranking": [
      {
        "amount": 50000,
        "memberDetails": {
          "_id": "user_id",
          "name": "John Doe",
          "avatar": "https://example.com/avatar.jpg",
          "uid": "12345",
          "country": "US",
          "currentBackground": "background_url",
          "currentTag": "tag_url",
          "currentLevel": 15,
          "equippedStoreItems": {...}
        }
      },
      {
        "amount": 45000,
        "memberDetails": {...}
      }
    ],
    "myRanking": {
      "amount": 1000,
      "memberDetails": {...},
      "rank": 5
    }
  }
}
```

### Response Fields

#### `ranking` (Array)
- `amount` (number): Total coins spent on gifts in the period
- `memberDetails` (object): User details including name, avatar, level, etc.

#### `myRanking` (Object)
- `amount` (number): Current user's total coins spent
- `memberDetails` (object): Current user's details
- `rank` (number | string): User's position in ranking (1-100 or "100+" if not in top 100)

---

## 2. Get Receiver Ranking

Returns the top 100 gift receivers ranked by total diamonds received.

### Endpoint

```
GET /api/ranking/receiver?period={period}
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | Yes | Time period: `daily`, `weekly`, or `monthly` |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "result": {
    "ranking": [
      {
        "amount": 50000,
        "memberDetails": {
          "_id": "user_id",
          "name": "Jane Smith",
          "avatar": "https://example.com/avatar.jpg",
          "uid": "67890",
          "country": "UK",
          "currentBackground": "background_url",
          "currentTag": "tag_url",
          "currentLevel": 20,
          "equippedStoreItems": {...}
        }
      }
    ],
    "myRanking": {
      "amount": 2500,
      "memberDetails": {...},
      "rank": 10
    }
  }
}
```

### Response Fields

#### `ranking` (Array)
- `amount` (number): Total diamonds received from gifts in the period
- `memberDetails` (object): User details

#### `myRanking` (Object)
- `amount` (number): Current user's total diamonds received
- `memberDetails` (object): Current user's details
- `rank` (number | string): User's position in ranking

---

## 3. Get Room Ranking

Returns the top 100 rooms ranked by total diamonds received from gifts.

### Endpoint

```
GET /api/ranking/room?period={period}
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | Yes | Time period: `daily`, `weekly`, or `monthly` |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "result": {
    "ranking": [
      {
        "amount": 100000,
        "roomDetails": {
          "roomPhoto": "https://example.com/room.jpg",
          "roomName": "Party Room",
          "hostLevel": 25
        }
      }
    ],
    "myRanking": {
      "amount": 5000,
      "memberDetails": {
        "roomPhoto": "https://example.com/my-room.jpg",
        "roomName": "My Room",
        "hostLevel": 10
      },
      "rank": 3
    }
  }
}
```

### Response Fields

#### `ranking` (Array)
- `amount` (number): Total diamonds received in the room
- `roomDetails` (object): Room details including photo, name, and host level

#### `myRanking` (Object)
- `amount` (number): Total diamonds received in the user's hosted room
- `memberDetails` (object): User's room details (or `{ roomPhoto: "", roomName: "Not a host", hostLevel: 0 }` if not a host)
- `rank` (number | string): Room's position in ranking

---

## 4. Get Inside Room Ranking

Returns the top 100 senders within a specific room, plus total room transaction.

### Endpoint

```
GET /api/audio-room/{roomId}/ranking/{period}
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomId` | string | Yes | The room ID |
| `period` | string | Yes | Time period: `daily`, `weekly`, or `monthly` |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Room ranking fetched successfully",
  "result": {
    "ranking": [
      {
        "amount": 10000,
        "memberDetails": {
          "_id": "user_id",
          "name": "Top Sender",
          "avatar": "https://example.com/avatar.jpg",
          "uid": "11111",
          "country": "IN",
          "currentBackground": "background_url",
          "currentTag": "tag_url",
          "currentLevel": 12,
          "equippedStoreItems": {...}
        }
      }
    ],
    "totalRoomTransaction": 500000,
    "myRanking": {
      "amount": 2000,
      "memberDetails": {...},
      "rank": 8
    }
  }
}
```

### Response Fields

#### `ranking` (Array)
- `amount` (number): Total coins spent by sender in this room during the period
- `memberDetails` (object): User details

#### `totalRoomTransaction` (number)
- All-time total coins spent in this room (not period-filtered)

#### `myRanking` (Object)
- `amount` (number): Current user's total coins spent in this room
- `memberDetails` (object): Current user's details
- `rank` (number | string): User's position in room ranking

---

## Error Responses

### 400 Bad Request - Missing or Invalid Period

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Period is required in the params and must be one of daily, weekly, monthly"
}
```

### 404 Not Found - User Not Found

```json
{
  "success": false,
  "statusCode": 404,
  "message": "User not found"
}
```

---

## Notes

1. **Ranking Limit**: All rankings are limited to the top 100 entries
2. **User Position**: If a user is not in the top 100, their rank will be "100+"
3. **Default Values**: If a user has no transactions in the period, their amount will be 0
4. **Period Boundaries**:
   - Daily: Starts at 00:00, ends at 23:59 of current day
   - Weekly: Starts Monday 00:00, ends Sunday 23:59
   - Monthly: Starts 1st 00:00, ends last day 23:59

---

## Data Sources

Rankings are computed from the `gift_records` collection with the following fields:

| Field | Description |
|-------|-------------|
| `senderId` | User who sent the gift |
| `receiverId` | User who received the gift |
| `roomId` | Room where gift was sent |
| `totalCoinCost` | Coins spent (gift.price * quantity) |
| `totalDiamonds` | Diamonds received (gift.diamonds * quantity) |
| `createdAt` | Timestamp of gift transaction |
