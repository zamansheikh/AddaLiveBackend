# App Reseller API Documentation

The **App Reseller System** provides five endpoints: two administrative endpoints for managing the reseller role (`re-seller`), one for Admin/SubAdmin to allocate coins to resellers, one for resellers to distribute coins to app users, and one for resellers to view their coin transfer history.

The system uses a dedicated **`resellerCoin`** field on the `UserStats` collection to track coins allocated to resellers by Admin/SubAdmin. This is separate from the regular `coins` field which represents the user's own balance.

---

## Global Authentication & Request Format

- **Base URL**: `/api/app-reseller`
- **Headers**:
  ```http
  Authorization: Bearer <your_jwt_token_here>
  Content-Type: application/json
  ```

---

## Endpoints

| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/app-reseller/` | Admin, SubAdmin | Get all resellers (paginated) |
| `PUT` | `/api/app-reseller/change-role` | Admin, SubAdmin | Change a user's role between `"user"` and `"re-seller"` |
| `PUT` | `/api/app-reseller/give-coins-to-reseller` | Admin, SubAdmin | Add coins to a reseller's **resellerCoin** balance |
| `PUT` | `/api/app-reseller/give-coins` | Reseller | Transfer coins from a reseller's **resellerCoin** balance to an app user |
| `GET` | `/api/app-reseller/coin-history` | Reseller | Get all coin transfers sent by the authenticated reseller |

---

## 1. Get All Resellers

Returns a paginated list of all users with the `userRole` set to `"re-seller"`.

- **Path**: `GET /api/app-reseller/`
- **Access**: `Admin` or `SubAdmin` only

### Query Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page` | `number` | No | `1` | Page number for pagination |
| `limit` | `number` | No | `10` | Number of results per page |

### Response (200 OK)

```json
{
  "success": true,
  "result": [
    {
      "_id": "665a1b2c3d4e5f6a7b8c9d0e",
      "username": "reseller01",
      "email": "reseller@example.com",
      "userId": 100245,
      "uid": "abc123xyz",
      "userRole": "re-seller",
      "name": "John Reseller",
      "phone": "+8801712345678",
      "avatar": "https://res.cloudinary.com/.../avatar.png",
      "isViewer": false,
      "verified": true,
      "createdAt": "2026-05-20T10:00:00.000Z",
      "updatedAt": "2026-05-26T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalPage": 3,
    "total": 25
  },
  "message": "Resellers retrieved successfully"
}
```

### Error Responses

**401 Unauthorized — Missing or invalid token**
```json
{
  "success": false,
  "message": "Authorization header missing or malformed"
}
```

**403 Forbidden — Insufficient role**
```json
{
  "success": false,
  "message": "Access denied: insufficient role"
}
```

---

## 2. Change User Role

Updates a user's role. The role can **only** be changed between `"user"` and `"re-seller"`. Both the current role and the new role must be one of these two values.

- **Path**: `PUT /api/app-reseller/change-role`
- **Access**: `Admin` or `SubAdmin` only

### Request Body

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `userId` | `string` | Yes | MongoDB `_id` of the target user |
| `role` | `string` | Yes | New role — must be `"user"` or `"re-seller"` |

#### Example

```json
{
  "userId": "665a1b2c3d4e5f6a7b8c9d0e",
  "role": "re-seller"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "result": [
    {
      "id": "665a1b2c3d4e5f6a7b8c9d0e",
      "userRole": "re-seller"
    }
  ],
  "message": "User role updated successfully to \"re-seller\""
}
```

### Error Responses

**400 Bad Request — Missing userId**
```json
{
  "success": false,
  "message": "userId is required"
}
```

**400 Bad Request — Missing role**
```json
{
  "success": false,
  "message": "role is required"
}
```

**400 Bad Request — Invalid role value**
```json
{
  "success": false,
  "message": "Invalid role. Allowed values: \"user\" or \"re-seller\""
}
```

**400 Bad Request — Same role (no-op)**
```json
{
  "success": false,
  "message": "User already has the role \"re-seller\""
}
```

**400 Bad Request — Current role not eligible**
```json
{
  "success": false,
  "message": "Cannot change role for users with role \"host\""
}
```

**404 Not Found — User does not exist**
```json
{
  "success": false,
  "message": "User not found"
}
```

---

## 3. Give Coins to Reseller

Transfers coins from an **Admin** or **SubAdmin** wallet to a reseller's **`resellerCoin`** balance. The coins are held in a separate pool (`resellerCoin`) that the reseller can then distribute to app users.

- **Admin coins**: deducted from the `admins` collection
- **SubAdmin coins**: deducted from the `portal_users` collection
- **Reseller coins**: added to the `resellerCoin` field in the `userstats` collection

- **Path**: `PUT /api/app-reseller/give-coins-to-reseller`
- **Access**: `Admin` or `SubAdmin` only

### Request Body

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `userId` | `string` | Yes | MongoDB `_id` of the target reseller |
| `coins` | `number` | Yes | Amount of coins to assign (must be a positive integer) |

#### Example

```json
{
  "userId": "665a1b2c3d4e5f6a7b8c9d0e",
  "coins": 1000
}
```

### Response (200 OK)

```json
{
  "success": true,
  "result": {
    "sender": {
      "id": "663f1a2b3c4d5e6f7a8b9c0d",
      "coins": 9000
    },
    "receiver": {
      "id": "665a1b2c3d4e5f6a7b8c9d0e",
      "coins": 1000
    }
  },
  "message": "Successfully assigned 1000 coins to reseller"
}
```

> **Note**: `receiver.coins` in the response represents the receiver's **`resellerCoin`** balance, not their regular `coins` balance.

### Error Responses

**400 Bad Request — Missing userId**
```json
{
  "success": false,
  "message": "userId is required"
}
```

**400 Bad Request — Missing coins**
```json
{
  "success": false,
  "message": "coins is required"
}
```

**400 Bad Request — Coins not a number**
```json
{
  "success": false,
  "message": "Coins must be a number"
}
```

**400 Bad Request — Coins not positive**
```json
{
  "success": false,
  "message": "Coins must be greater than 0"
}
```

**400 Bad Request — Insufficient coins**
```json
{
  "success": false,
  "message": "Insufficient coins"
}
```

**400 Bad Request — Target is not a reseller**
```json
{
  "success": false,
  "message": "Target user is not a reseller (role: \"user\")"
}
```

**401 Unauthorized — Missing coin-distributor permission (SubAdmin)**
```json
{
  "success": false,
  "message": "You do not have the coin-distributor permission to assign coins"
}
```

**404 Not Found — Sender not found**
```json
{
  "success": false,
  "message": "Sender not found"
}
```

**404 Not Found — Reseller not found**
```json
{
  "success": false,
  "message": "Reseller not found"
}
```

---

## 4. Give Coins to User

Transfers coins from a reseller's **`resellerCoin`** balance to a target app user's regular **`coins`** balance. The reseller must be authenticated with the `"re-seller"` role.

**Key behaviour:**
- Coins are **deducted** from the reseller's `resellerCoin` field (not regular `coins`)
- Coins are **added** to the target user's regular `coins` field
- Resellers **can** transfer coins to themselves (converts their own `resellerCoin` → regular `coins`)
- Level/tag recalculation and referral tracking apply to the **receiver**

- **Path**: `PUT /api/app-reseller/give-coins`
- **Access**: `Reseller` (`"re-seller"`) only

### Request Body

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `userId` | `string` | Yes | MongoDB `_id` of the target app user |
| `coins` | `number` | Yes | Amount of coins to transfer (must be a positive integer) |

#### Example — Transfer to another user

```json
{
  "userId": "665a1b2c3d4e5f6a7b8c9d0e",
  "coins": 500
}
```

#### Example — Self-transfer (convert resellerCoin to regular coins)

```json
{
  "userId": "663f1a2b3c4d5e6f7a8b9c0d",
  "coins": 200
}
```

### Response (200 OK)

```json
{
  "success": true,
  "result": {
    "sender": {
      "id": "663f1a2b3c4d5e6f7a8b9c0d",
      "coins": 4500
    },
    "receiver": {
      "id": "665a1b2c3d4e5f6a7b8c9d0e",
      "coins": 1500
    }
  },
  "message": "Successfully assigned 500 coins to user"
}
```

> **Note**: `sender.coins` in the response represents the reseller's **`resellerCoin`** balance after deduction, not their regular `coins` balance. `receiver.coins` is the target user's regular `coins` balance.

### Error Responses

**400 Bad Request — Missing userId**
```json
{
  "success": false,
  "message": "userId is required"
}
```

**400 Bad Request — Missing coins**
```json
{
  "success": false,
  "message": "coins is required"
}
```

**400 Bad Request — Coins not a number**
```json
{
  "success": false,
  "message": "Coins must be a number"
}
```

**400 Bad Request — Coins not positive**
```json
{
  "success": false,
  "message": "Coins must be greater than 0"
}
```

**400 Bad Request — Coins not a whole number**
```json
{
  "success": false,
  "message": "Coins must be a whole number"
}
```

**400 Bad Request — Insufficient reseller coins**
```json
{
  "success": false,
  "message": "not enough reseller coins"
}
```

**401 Unauthorized — Not a reseller**
```json
{
  "success": false,
  "message": "Only resellers can perform this action"
}
```

**404 Not Found — Reseller not found**
```json
{
  "success": false,
  "message": "Reseller not found"
}
```

**404 Not Found — Target user not found**
```json
{
  "success": false,
  "message": "Target user not found"
}
```

---

## 5. Get Reseller Coin History

Returns all coin transfers **sent** by the authenticated reseller, with receiver info and pagination. Only users with the `"re-seller"` role can access this endpoint.

- **Path**: `GET /api/app-reseller/coin-history`
- **Access**: `Reseller` (`"re-seller"`) only

### Query Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page` | `number` | No | `1` | Page number for pagination |
| `limit` | `number` | No | `10` | Number of results per page |

### Response (200 OK)

```json
{
  "success": true,
  "result": {
    "pagination": {
      "total": 45,
      "limit": 10,
      "page": 1,
      "totalPage": 5
    },
    "data": [
      {
        "_id": "665a1b2c3d4e5f6a7b8c9d0e",
        "senderId": "664f2a1b3c4d5e6f7a8b9c0d",
        "senderRole": "re-seller",
        "receiverRole": "user",
        "amount": 50,
        "createdAt": "2026-07-17T14:30:00.000Z",
        "receiverInfo": {
          "_id": "665f3b2c4d5e6f7a8b9c0d1e",
          "name": "John Doe",
          "email": "john@example.com",
          "uid": "user_abc123",
          "avatar": "https://res.cloudinary.com/.../avatar.png",
          "level": 5
        }
      },
      {
        "_id": "665a1b2c3d4e5f6a7b8c9d0f",
        "senderId": "664f2a1b3c4d5e6f7a8b9c0d",
        "senderRole": "re-seller",
        "receiverRole": "user",
        "amount": 100,
        "createdAt": "2026-07-16T10:15:00.000Z",
        "receiverInfo": {
          "_id": "665f4c3d5e6f7a8b9c0d1e2f",
          "name": "Jane Smith",
          "email": "jane@example.com",
          "uid": "user_def456",
          "avatar": "https://res.cloudinary.com/.../avatar2.png",
          "level": 12
        }
      }
    ]
  },
  "message": "Coin history retrieved successfully"
}
```

### Response Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `data[].receiverInfo` | `object \| null` | Receiver user info (looked up from `users` collection) |
| `data[].receiverInfo._id` | `string` | Receiver's MongoDB `_id` |
| `data[].receiverInfo.name` | `string` | Receiver's display name |
| `data[].receiverInfo.email` | `string` | Receiver's email address |
| `data[].receiverInfo.uid` | `string` | Receiver's unique user ID |
| `data[].receiverInfo.avatar` | `string` | Receiver's avatar URL |
| `data[].receiverInfo.level` | `number` | Receiver's current level |

### Error Responses

**401 Unauthorized — Not a reseller**
```json
{
  "success": false,
  "message": "Only resellers can view this history"
}
```

---

## Behavior & Validation Rules

### Role Management (endpoints 1 & 2)

1. **Role Restriction**: The role can **only** be toggled between `"user"` (`UserRoles.User`) and `"re-seller"` (`UserRoles.Reseller`). Any other role value or target user with a different current role will be rejected.
2. **No-op Guard**: If the target user already has the requested role, the request is rejected with a `400 Bad Request` — the endpoint does not silently succeed.
3. **Idempotent**: Excluding the no-op case, a successful update always sets the precise requested role on the user document.

### Admin/SubAdmin → Reseller Coin Transfer (endpoint 3)

1. **Atomicity**: The entire transfer runs inside a MongoDB transaction — all steps commit or roll back together.
2. **Permission Check (SubAdmin)**: SubAdmins must have the `coin-distributor` (`AdminPowers.CoinDistribute`) permission to use this endpoint.
3. **Sufficiency Check**: Sender balance is atomically checked before deduction.
4. **Audit Trail**: Every transfer creates a coin history record with `senderRole` (admin/sub-admin) and `receiverRole: "re-seller"`.

### Reseller → User Coin Transfer (endpoint 4)

1. **ResellerCoin Deduction**: Coins are deducted from the reseller's `resellerCoin` field (not their regular `coins`).
2. **Self-transfer Allowed**: A reseller can transfer coins to themselves, effectively converting their `resellerCoin` balance into regular spendable `coins`.
3. **Atomicity**: The entire transfer runs inside a MongoDB transaction.
4. **Sufficiency Check**: `resellerCoinDeduction` atomically checks that `resellerCoin >= amount` before deducting.
5. **Level Update (non-XP mode)**: When `XP_MODE` is not `"1"`, the target user's `totalBoughtCoins`, `level`, `currentLevelTag`, and `currentLevelBackground` are recalculated.
6. **Referral Tracking**: The referral recharge hook runs after the transaction commits (fire-and-forget).
7. **Audit Trail**: Every transfer creates a coin history record with `senderRole: "re-seller"` and `receiverRole: "user"`.

### Reseller Coin History (endpoint 5)

1. **Sent Only**: Returns only records where the authenticated user is the **sender** (`senderId`), not the receiver.
2. **Reseller Verification**: The service layer verifies `userRole === "re-seller"` before returning results.
3. **Receiver Info**: Each record includes `receiverInfo` with the receiver's name, email, uid, avatar, and level (looked up from the `users` collection).
4. **Pagination**: Standard QueryBuilder pagination via `page` and `limit` query parameters.
5. **TTL Expiry**: Coin history records auto-delete after 30 days due to a TTL index on `expireAt`.

---

## Data Model Reference

### UserStats Document Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `userId` | `ObjectId` | Reference to the user (unique, indexed) |
| `coins` | `number` | Regular coin balance (default: 0) |
| `resellerCoin` | `number` | Reseller coin balance — coins allocated by Admin/SubAdmin for resellers to distribute (default: 0) |
| `diamonds` | `number` | Diamond balance (default: 0) |
| `stars` | `number` | Stars (default: 0) |
| `levels` | `number` | Level (default: 0) |
| `gifts` | `array` | Gift inventory |

### User Document Fields (relevant subset)

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | `ObjectId` | MongoDB unique identifier |
| `userRole` | `string` (enum) | One of `UserRoles` enum values; defaults to `"user"` |
| `username` | `string` | Display username |
| `email` | `string` | Email address |
| `userId` | `number` | Auto-incrementing short user ID starting at 100001 |
| `totalBoughtCoins` | `number` | Cumulative coins bought (used for level recalculation) |
| `level` | `number` | Current user level |
| `currentLevelTag` | `string` | Level tag badge (e.g. "1-5", "6-10") |
| `currentLevelBackground` | `string` | Level background image URL |
| `isReseller` | `boolean` | Whether this user is a reseller |
| `resellerCoins` | `number` | Reseller coin balance on the user document (separate from userstats.resellerCoin) |

### UserRoles Enum (relevant subset)

| Enum | Value |
| :--- | :--- |
| `UserRoles.User` | `"user"` |
| `UserRoles.Reseller` | `"re-seller"` |
| `UserRoles.Admin` | `"admin"` |
| `UserRoles.SubAdmin` | `"sub-admin"` |

### AdminPowers Enum (relevant subset)

| Enum | Value |
| :--- | :--- |
| `AdminPowers.CoinDistribute` | `"coin-distributor"` |

---

## Repository Methods

### UserStatsRepository

| Method | Description |
| :--- | :--- |
| `updateCoins(userId, coins, session?)` | Increments/decrements the regular `coins` field |
| `balanceDeduction(userId, amount, session?)` | Atomically checks `coins >= amount` then deducts from regular `coins` |
| `updateResellerCoins(userId, coins, session?)` | Increments/decrements the `resellerCoin` field |
| `resellerCoinDeduction(userId, amount, session?)` | Atomically checks `resellerCoin >= amount` then deducts from `resellerCoin` |

### CoinHistoryRepository

| Method | Description |
| :--- | :--- |
| `createHistory(data, session?)` | Creates a coin history audit record |
| `getResellerHistories(senderId, query)` | Returns paginated coin history where the sender is the given reseller, with receiver info joined from `users` |

---

## File Structure Reference

```
src/
├── entities/
│   └── userstats/
│       └── userstats_interface.ts        # IUserStats with resellerCoin field
├── models/
│   ├── userstats/
│   │   └── userstats_model.ts            # Mongoose schema with resellerCoin field
│   └── coins/
│       └── coinHistoryModel.ts           # CoinHistory schema (senderId, receiverId, amount, TTL)
├── repository/
│   ├── users/
│   │   ├── userstats_repository_interface.ts  # IUserStatsRepository with new methods
│   │   └── userstats_repository.ts             # Implementation of resellerCoin methods
│   └── coins/
│       └── coinHistoryRepository.ts      # getResellerHistories() for reseller coin history
├── services/app_reseller/
│   └── app_reseller_service.ts           # Business logic for all 5 endpoints
├── controllers/
│   └── app_reseller_controller.ts        # Request validation + response formatting
├── router/
│   └── app_reseller_routes.ts            # Standalone router mounted at /api/app-reseller
└── server.ts                             # app.use("/api/app-reseller", AppResellerRouter)
```
