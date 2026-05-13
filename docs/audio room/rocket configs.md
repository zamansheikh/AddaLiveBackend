# Rocket Configuration API Documentation

This documentation covers the administration APIs for managing Rocket Launch configurations. These settings control the milestones required for rewards, the reward multipliers, and the ranges for random Coin/XP rewards.

**Base URL:** `/api/admin/rocket-config`  
**Authentication:** Required (Admin Role only)  
**Headers:** `Authorization: Bearer <ADMIN_TOKEN>`

---

## 1. Get Current Configuration

Retrieves the active rocket configuration from the database.

- **URL:** `/`
- **Method:** `GET`
- **Permissions:** Admin Only

### Success Response
- **Code:** `200 OK`
- **Content Example:**
```json
{
  "status": "success",
  "data": {
    "milestones": [50000, 100000, 250000, 500000, 1000000],
    "rewardNumbers": [1, 2, 5, 10, 20],
    "coinMin": 100,
    "coinMax": 1000,
    "xpMin": 50,
    "xpMax": 500,
    "createdAt": "2026-05-13T10:00:00.000Z",
    "updatedAt": "2026-05-13T12:00:00.000Z"
  }
}
```

---

## 2. Update Configuration

Updates the configuration settings. Updating this will trigger an **immediate in-memory synchronization**, meaning the server logic will start using the new values without requiring a restart.

- **URL:** `/`
- **Method:** `POST`
- **Permissions:** Admin Only

### Request Body
| Field | Type | Description |
| :--- | :--- | :--- |
| `milestones` | `number[]` | Array of fuel values required for each stage. |
| `rewardNumbers` | `number[]` | Array of multipliers or counts for each milestone stage. |
| `coinMin` | `number` | Minimum possible coins in a random reward. |
| `coinMax` | `number` | Maximum possible coins in a random reward. |
| `xpMin` | `number` | Minimum possible XP in a random reward. |
| `xpMax` | `number` | Maximum possible XP in a random reward. |

**Example Request:**
```json
{
  "milestones": [60000, 120000, 300000, 600000, 1200000],
  "rewardNumbers": [1, 3, 7, 15, 30],
  "coinMin": 200,
  "coinMax": 1500,
  "xpMin": 100,
  "xpMax": 800
}
```

### Success Response
- **Code:** `200 OK`
- **Content:**
```json
{
  "status": "success",
  "message": "Rocket configuration updated and synchronized successfully"
}
```

---

## 3. Error Responses

### Validation Errors (400 Bad Request)
Returned when the input data violates business rules.

**Example: Array Length Mismatch**
```json
{
  "status": "fail",
  "message": "Milestones and Reward Numbers arrays must have the same length"
}
```

**Common Validation Messages:**
- `Milestones must be a non-empty array`
- `Coin Min cannot be greater than Coin Max`
- `XP Min and Max must be numbers`

### Authentication Errors (401/403)
**401 Unauthorized (Missing/Expired Token):**
```json
{
  "status": "fail",
  "message": "You are not logged in! Please log in to get access."
}
```

**403 Forbidden (Not an Admin):**
```json
{
  "status": "fail",
  "message": "You do not have permission to perform this action"
}
```
