# App Reseller API Documentation

The **App Reseller System** provides two administrative endpoints for managing the reseller role (`re-seller`) on the platform. Admins and SubAdmins can change a user's role between `"user"` and `"re-seller"`, and list all existing resellers with pagination.

---

## Global Authentication & Request Format

- **Base URL**: `/api/app-reseller`
- **Headers**:
  ```http
  Authorization: Bearer <your_jwt_token_here>
  Content-Type: application/json
  ```
- **Access Control**:
  - Both endpoints require `Admin` or `SubAdmin` authentication.

---

## Endpoints

| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/app-reseller/` | Admin, SubAdmin | Get all resellers (paginated) |
| `PUT` | `/api/app-reseller/change-role` | Admin, SubAdmin | Change a user's role between `"user"` and `"re-seller"` |

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

## Behavior & Validation Rules

1. **Role Restriction**: The role can **only** be toggled between `"user"` (`UserRoles.User`) and `"re-seller"` (`UserRoles.Reseller`). Any other role value or target user with a different current role will be rejected.
2. **No-op Guard**: If the target user already has the requested role, the request is rejected with a `400 Bad Request` — the endpoint does not silently succeed.
3. **Idempotent**: Excluding the no-op case, a successful update always sets the precise requested role on the user document.

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
│   └── app_reseller_service.ts       # Business logic (update role + list resellers)
├── controllers/
│   └── app_reseller_controller.ts     # Request validation + response formatting
├── router/
│   └── app_reseller_routes.ts         # Standalone router mounted at /api/app-reseller
└── server.ts                          # app.use("/api/app-reseller", AppResellerRouter)
```
