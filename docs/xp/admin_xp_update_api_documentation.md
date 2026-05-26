# Admin XP Update API Documentation

The **Admin XP Update System** allows the platform admin to increase a user's XP. Since XP is directly tied to the user's level (determined by `xpLevels` thresholds in the XP Configuration), increasing XP automatically recalculates the user's level. If the result is a higher level, a real-time level-up event is emitted to the user via WebSocket.

---

## Global Authentication & Request Format

- **Base URL**: `/api/admin`
- **Headers**:
  ```http
  Authorization: Bearer <your_jwt_token_here>
  Content-Type: application/json
  ```
- **Access Control**: `Admin` only

---

## 1. Update User XP

Increases a user's `totalEarnedXp` by the specified amount. The user's `level` is recalculated based on the new total using the configured `xpLevels` thresholds. If the user crosses a level threshold, a `LevelUp` WebSocket event is emitted to the user in real time.

- **Path**: `PUT /api/admin/users/xp/:userId`
- **Access Control**: `Admin` only
- **Summary**: Adds XP to a user's account, automatically adjusting their level if a threshold is crossed.

### Path Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `userId` | `string` | MongoDB ObjectId of the target user |

### Request Body

```json
{
  "xpAmount": 5000
}
```

### Validation Rules

| Field | Type | Required | Validation |
| :--- | :--- | :--- | :--- |
| `xpAmount` | `number` | Yes | Must be a valid number greater than 0 |

### Response (200 OK)

Returns the user's updated XP total and level.

```json
{
  "success": true,
  "result": {
    "totalEarnedXp": 25500,
    "level": 3
  },
  "message": "User XP updated successfully"
}
```

### Error Responses

#### 400 Bad Request — Invalid xpAmount
```json
{
  "success": false,
  "message": "xpAmount must be greater than 0"
}
```

#### 400 Bad Request — Missing or Non-Numeric xpAmount
```json
{
  "success": false,
  "message": "xpAmount must be a valid number"
}
```

#### 404 Not Found — User Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

#### 500 Internal Server Error — Update Failed
```json
{
  "success": false,
  "message": "Failed to update user XP"
}
```

---

## 2. Endpoints Summary

| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `PUT` | `/api/admin/users/xp/:userId` | Admin | Increase a user's XP and recalculate their level |

---

## 3. Key Error Handlers & Status Codes

The backend responds with standardized JSON errors when validation rules are violated:

- **`400 Bad Request`** — Input parameters are missing or invalid (e.g. non-positive `xpAmount`, non-numeric value).
  ```json
  {
    "success": false,
    "message": "xpAmount must be greater than 0"
  }
  ```

- **`401 Unauthorized`** — Authorization header is missing, malformed, or contains an expired token.
  ```json
  {
    "success": false,
    "message": "Invalid or expired token"
  }
  ```

- **`403 Forbidden`** — User has authenticated successfully, but does not possess the `Admin` role required for this endpoint.
  ```json
  {
    "success": false,
    "message": "Access denied: insufficient role"
  }
  ```

- **`404 Not Found`** — The provided `userId` does not match any registered user.
  ```json
  {
    "success": false,
    "message": "User not found"
  }
  ```

---

## 4. Implementation Notes

- **XP → Level Relationship**: The user's `level` is derived from `totalEarnedXp` using the `xpLevels` threshold array configured in the **XP Configuration** (managed via `GET/POST /api/admin/xp-config`). Each index in the array represents the XP threshold required to reach that level. For example, `xpLevels: [160, 325, 460, ...]` means level 0 requires 0–159 XP, level 1 requires 160–324 XP, level 2 requires 325–459 XP, and so on.
- **Level-Up Event**: If the XP increase causes the user to cross a level threshold, a real-time WebSocket event (`AudioRoomChannels.LevelUp`) is emitted directly to the user with the new level payload:
  ```json
  { "level": 5 }
  ```
- **Non-Cumulative Levels**: Levels are **not** incremented by 1 per update. They are always recalculated from the total `totalEarnedXp` against the full threshold array. This means an admin can grant a large XP amount that advances the user multiple levels at once.
- **Idempotent Calculation**: Calling this API multiple times with the same `xpAmount` will correctly accumulate XP and recalculate the level each time.
- **Audit Trail**: This endpoint does **not** create a coin history or XP audit record by default. If audit tracking is required, it should be added separately (e.g., via a dedicated XP history collection).
