# App Reseller API Documentation

The **App Reseller System** provides three endpoints: two administrative endpoints for managing the reseller role (`re-seller`) and one operational endpoint for resellers to distribute coins to app users.

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
| `PUT` | `/api/app-reseller/give-coins` | Reseller | Transfer coins from a reseller to an app user |

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

## 3. Give Coins to User

Transfers coins from a reseller's wallet to a target app user. The reseller must be authenticated with the `"re-seller"` role and must have sufficient coins. The transfer is executed inside a MongoDB transaction — if any step fails, all changes are rolled back.

**Side effects:**
- **Level update (non-XP mode):** If `XP_MODE` environment variable is not set or is `"0"`, the target user's `totalBoughtCoins`, `level`, `currentLevelTag`, and `currentLevelBackground` are recalculated and updated.
- **Referral tracking:** If the target user was referred by someone, the referrer's recharge milestone progress is updated (fire-and-forget — failures are logged but never roll back the transfer).
- **Coin history:** An audit record is created in the coin history collection.

- **Path**: `PUT /api/app-reseller/give-coins`
- **Access**: `Reseller` (`"re-seller"`) only

### Request Body

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `userId` | `string` | Yes | MongoDB `_id` of the target app user |
| `coins` | `number` | Yes | Amount of coins to transfer (must be a positive integer) |

#### Example

```json
{
  "userId": "665a1b2c3d4e5f6a7b8c9d0e",
  "coins": 500
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

**400 Bad Request — Self-transfer**
```json
{
  "success": false,
  "message": "Self-transfer is not allowed"
}
```

**400 Bad Request — Insufficient coins**
```json
{
  "success": false,
  "message": "not enough coins"
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

## Behavior & Validation Rules

### Role Management (endpoints 1 & 2)

1. **Role Restriction**: The role can **only** be toggled between `"user"` (`UserRoles.User`) and `"re-seller"` (`UserRoles.Reseller`). Any other role value or target user with a different current role will be rejected.
2. **No-op Guard**: If the target user already has the requested role, the request is rejected with a `400 Bad Request` — the endpoint does not silently succeed.
3. **Idempotent**: Excluding the no-op case, a successful update always sets the precise requested role on the user document.

### Coin Transfer (endpoint 3)

1. **Atomicity**: The entire transfer (deduction + addition + level update + history) runs inside a MongoDB transaction. If any step fails, all changes are rolled back.
2. **Sufficiency Check**: `balanceDeduction` atomically checks that `coins >= amount` before deducting. Insufficient funds return a `400 Bad Request`.
3. **Self-transfer Prevention**: The reseller cannot transfer coins to their own account.
4. **XP Mode**: When `XP_MODE=1`, level/tag recalculation is skipped — only coin balances and history are updated.
5. **Referral Handling**: The referral recharge hook runs **after** the transaction commits and is fire-and-forget. A referral failure is logged but never reverts the coin transfer.
6. **Audit Trail**: Every transfer creates a coin history record with `senderRole: "re-seller"` and `receiverRole: "user"`.

---

## Data Model Reference

### Relevant User Document Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | `ObjectId` | MongoDB unique identifier |
| `userRole` | `string` (enum) | One of `UserRoles` enum values; defaults to `"user"` |
| `username` | `string` | Display username |
| `email` | `string` | Email address |
| `userId` | `number` | Auto-incrementing short user ID starting at 100001 |
| `totalBoughtCoins` | `number` | Cumulative coins bought (used for level recalculation) |
| `level` | `number` | Current user level (updated during coin transfer in non-XP mode) |
| `currentLevelTag` | `string` | Level tag badge (e.g. "1-5", "6-10") |
| `currentLevelBackground` | `string` | Level background image URL |

### UserRoles Enum (relevant subset)

| Enum | Value |
| :--- | :--- |
| `UserRoles.User` | `"user"` |
| `UserRoles.Reseller` | `"re-seller"` |

---

## File Structure Reference

```
src/
├── services/app_reseller/
│   └── app_reseller_service.ts       # Business logic (update role, list resellers, give coins)
├── controllers/
│   └── app_reseller_controller.ts     # Request validation + response formatting
├── router/
│   └── app_reseller_routes.ts         # Standalone router mounted at /api/app-reseller
└── server.ts                          # app.use("/api/app-reseller", AppResellerRouter)
```
