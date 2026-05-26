# Medal System API Documentation

The **Medal System** rewards users with achievement badges when they reach specific levels. It consists of:

1. **Medal CRUD API** — Admins create, read, update, and delete medals (each medal tied to a specific level).
2. **Auto-Award System** — When a user levels up, the system automatically checks for and awards any medals matching the new level.
3. **Retroactive Award API** — Admin-triggered bulk award for existing users who already meet medal level requirements.

---

## Global Authentication & Request Format

- **Base URL**: `/api/medals`
- **Headers**:
  ```http
  Authorization: Bearer <your_jwt_token_here>
  Content-Type: multipart/form-data  (for create/update with icon)
  Content-Type: application/json      (for read/delete operations)
  ```
- **Access Control**:
  - **Admin** role required for `POST`, `PUT`, `DELETE`, and `POST /retroactive`
  - **Any authenticated user** for `GET` operations

---

## Part 1: Medal CRUD API

### Endpoints

| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/medals` | Admin | Create a new medal (with icon upload) |
| `GET` | `/api/medals` | Any authenticated | List all medals (sorted by level ascending) |
| `GET` | `/api/medals/:id` | Any authenticated | Get a single medal by ID |
| `PUT` | `/api/medals/:id` | Admin | Update a medal (partial update, icon optional) |
| `DELETE` | `/api/medals/:id` | Admin | Delete a medal (cleans up icons + user references) |

---

### 1.1 Create Medal

Creates a new medal tied to a specific level. The `level` must be unique — only one medal per level is allowed.

- **Path**: `POST /api/medals`
- **Content-Type**: `multipart/form-data`

#### Form Fields

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | Yes | Display name of the medal (e.g., "Bronze Star") |
| `level` | `number` | Yes | The user level required to earn this medal (must be unique) |
| `icon` | `file` | Yes | Medal icon image (uploaded to Cloudinary) |
| `description` | `string` | No | Optional description of the medal |

#### Response (201 Created)

```json
{
  "success": true,
  "result": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "name": "Bronze Star",
    "level": 5,
    "icon": "https://res.cloudinary.com/.../medal_assets/abc123.png",
    "description": "Awarded for reaching level 5",
    "createdAt": "2026-05-26T10:00:00.000Z",
    "updatedAt": "2026-05-26T10:00:00.000Z"
  },
  "message": "Medal created successfully"
}
```

#### Error Responses

**409 Conflict — Duplicate level**
```json
{
  "success": false,
  "message": "A medal already exists for this level"
}
```

**400 Bad Request — Missing required fields**
```json
{
  "success": false,
  "message": "name, level, and icon are required"
}
```

---

### 1.2 List All Medals

Returns all medals sorted by `level` in ascending order.

- **Path**: `GET /api/medals`

#### Response (200 OK)

```json
{
  "success": true,
  "result": [
    {
      "_id": "665a1b2c3d4e5f6a7b8c9d0e",
      "name": "Bronze Star",
      "level": 5,
      "icon": "https://res.cloudinary.com/.../medal_assets/abc123.png",
      "description": "Awarded for reaching level 5",
      "createdAt": "2026-05-26T10:00:00.000Z",
      "updatedAt": "2026-05-26T10:00:00.000Z"
    },
    {
      "_id": "665a1b2c3d4e5f6a7b8c9d0f",
      "name": "Silver Star",
      "level": 10,
      "icon": "https://res.cloudinary.com/.../medal_assets/def456.png",
      "description": "Awarded for reaching level 10",
      "createdAt": "2026-05-26T10:00:00.000Z",
      "updatedAt": "2026-05-26T10:00:00.000Z"
    }
  ],
  "message": "Medals retrieved successfully"
}
```

---

### 1.3 Get Medal by ID

- **Path**: `GET /api/medals/:id`

#### Response (200 OK)

```json
{
  "success": true,
  "result": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "name": "Bronze Star",
    "level": 5,
    "icon": "https://res.cloudinary.com/.../medal_assets/abc123.png",
    "description": "Awarded for reaching level 5",
    "createdAt": "2026-05-26T10:00:00.000Z",
    "updatedAt": "2026-05-26T10:00:00.000Z"
  },
  "message": "Medal retrieved successfully"
}
```

#### Error Responses

**404 Not Found**
```json
{
  "success": false,
  "message": "Medal not found"
}
```

---

### 1.4 Update Medal

Updates a medal's fields. The icon replacement is safe — the new icon is uploaded to Cloudinary **before** the old one is deleted, so a failed upload leaves the old icon intact.

- **Path**: `PUT /api/medals/:id`
- **Content-Type**: `multipart/form-data`

#### Form Fields

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | At least one field required | Updated display name |
| `level` | `number` | At least one field required | Updated level (must remain unique across medals) |
| `icon` | `file` | At least one field required | New medal icon (replaces existing Cloudinary icon) |
| `description` | `string` | At least one field required | Updated description |

#### Response (200 OK)

```json
{
  "success": true,
  "result": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "name": "Gold Star",
    "level": 15,
    "icon": "https://res.cloudinary.com/.../medal_assets/new789.png",
    "description": "Awarded for reaching level 15",
    "createdAt": "2026-05-26T10:00:00.000Z",
    "updatedAt": "2026-05-27T10:00:00.000Z"
  },
  "message": "Medal updated successfully"
}
```

#### Error Responses

**400 Bad Request — Invalid level**
```json
{
  "success": false,
  "message": "level must be a number"
}
```

**400 Bad Request — No fields provided**
```json
{
  "success": false,
  "message": "At least one field (name, level, description, icon) is required for update"
}
```

**409 Conflict — New level already taken by another medal**
```json
{
  "success": false,
  "message": "A medal already exists for this level"
}
```

---

### 1.5 Delete Medal

Deletes a medal and performs two cleanup operations:

1. **Cloudinary cleanup**: The medal's icon is deleted from Cloudinary storage.
2. **User reference cleanup**: The medal reference is removed from **all users'** `earnedMedals` arrays via `$pull` — preventing orphaned references.

- **Path**: `DELETE /api/medals/:id`

#### Response (200 OK)

```json
{
  "success": true,
  "result": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "name": "Bronze Star",
    "level": 5,
    "icon": "https://res.cloudinary.com/.../medal_assets/abc123.png",
    "description": "Awarded for reaching level 5",
    "createdAt": "2026-05-26T10:00:00.000Z",
    "updatedAt": "2026-05-26T10:00:00.000Z"
  },
  "message": "Medal deleted successfully"
}
```

#### Error Responses

**404 Not Found**
```json
{
  "success": false,
  "message": "Medal not found"
}
```

---

## Part 2: Retroactive Medal Award API

When medals are created **after** users have already reached the required levels, this endpoint awards all qualifying medals to existing users.

- **Path**: `POST /api/medals/retroactive`
- **Access**: Admin only

#### How It Works

For each medal in the system, one atomic MongoDB `updateMany` is executed:

```javascript
User.updateMany(
  {
    level: { $gte: medal.level },       // User's level meets the requirement
    "earnedMedals.medalId": { $ne: medal._id }  // User hasn't already earned this medal
  },
  {
    $push: {
      earnedMedals: { medalId: medal._id, earnedAt: new Date() }
    }
  }
)
```

The `$ne` filter ensures **idempotency** — running this endpoint multiple times will never create duplicate medal entries.

#### Example Scenario

| Medal | Level | Users awarded | Condition |
| :--- | :--- | :--- | :--- |
| Bronze Star | 5 | All users ≥ level 5 who don't have it | `{ level: { $gte: 5 }, "earnedMedals.medalId": { $ne: <bronzeId> } }` |
| Silver Star | 10 | All users ≥ level 10 who don't have it | `{ level: { $gte: 10 }, "earnedMedals.medalId": { $ne: <silverId> } }` |
| Gold Star | 15 | All users ≥ level 15 who don't have it | `{ level: { $gte: 15 }, "earnedMedals.medalId": { $ne: <goldId> } }` |

So a user at level 20 when the admin creates medals for levels 5, 10, 15 and hits the retroactive endpoint would receive **all 3 medals**.

#### Response (200 OK)

```json
{
  "success": true,
  "result": {
    "totalAwarded": 1523,
    "medalsAwarded": [
      {
        "medalName": "Bronze Star",
        "level": 5,
        "count": 850
      },
      {
        "medalName": "Silver Star",
        "level": 10,
        "count": 423
      },
      {
        "medalName": "Gold Star",
        "level": 15,
        "count": 250
      }
    ]
  },
  "message": "Retroactive award complete: 1523 medal(s) awarded"
}
```

#### Error Responses

**400 Bad Request — No medals exist**
```json
{
  "success": false,
  "message": "No medals exist to award. Create medals first."
}
```

---

## Part 3: Auto-Award System (Client-Side)

### 3.1 How Medals Are Awarded

When a user's XP increases (via admin update or gift spending), the system:

1. Atomically increments `totalEarnedXp` using `$inc` (no race conditions, no lost XP).
2. Recalculates the user's level from the new total XP.
3. If the level increased, awards medals for **every** intermediate level between the old and new level.
4. For each medal level, runs an atomic MongoDB `updateOne` with `$ne + $push`:

```javascript
User.updateOne(
  { _id: userId, "earnedMedals.medalId": { $ne: medal._id } },
  { $push: { earnedMedals: { medalId: medal._id, earnedAt: new Date() } } }
)
```

The `$ne` guard prevents duplicate medal entries even under concurrent requests.

#### Multi-Level Jump Example

A user jumps from **level 3** to **level 7**:

| Medal exists for level | Awarded? |
| :--- | :--- |
| Level 5 (Bronze Star) | ✅ Yes |
| Level 7 (Silver Star) | ✅ Yes |

The system iterates `level 4 → 5 → 6 → 7` and awards any medals found at those levels.

### 3.2 Thread Safety

All medal-related operations use **atomic MongoDB operators** to prevent race conditions:

| Operation | Mechanism | Prevents |
| :--- | :--- | :--- |
| XP increment | `$inc` | Lost XP under concurrent requests |
| Medal award | `$ne + $push` | Duplicate medal entries |
| Level update | `$set` with `{ $lt: level }` guard | Slower concurrent request can't overwrite a higher level with an older, lower one |

### 3.3 User Document Fields

The `earnedMedals` field on the user document:

| Field | Type | Description |
| :--- | :--- | :--- |
| `earnedMedals` | `object[]` | Array of earned medal entries |
| `earnedMedals[].medalId` | `ObjectId` (ref: `medals`) | Reference to the medal document |
| `earnedMedals[].earnedAt` | `Date` | When the medal was earned |

---

## Part 4: Data Model Reference

### MongoDB Collection: `medals`

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | `ObjectId` | MongoDB unique identifier |
| `name` | `string` | Display name of the medal |
| `level` | `number` | Required user level to earn this medal (unique index) |
| `icon` | `string` | Cloudinary URL of the medal icon image |
| `description` | `string` | Optional description of the medal |
| `createdAt` | `Date` | Timestamp from Mongoose `timestamps: true` |
| `updatedAt` | `Date` | Timestamp from Mongoose `timestamps: true` |

### Cloudinary Storage

- **Folder**: `medal_assets`
- **Enum**: `CloudinaryFolder.MedalAssets`

---

## Part 5: Endpoints Summary

| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/medals` | Admin | Create a medal with icon upload |
| `GET` | `/api/medals` | Any authenticated | List all medals sorted by level |
| `GET` | `/api/medals/:id` | Any authenticated | Get a single medal by ID |
| `PUT` | `/api/medals/:id` | Admin | Update a medal (partial, safe icon swap) |
| `DELETE` | `/api/medals/:id` | Admin | Delete medal + cleanup user references |
| `POST` | `/api/medals/retroactive` | Admin | Bulk-award medals to existing qualifying users |

---

## Part 6: File Structure Reference

```
src/
├── models/medal/
│   └── medal_model.ts           # Mongoose schema (name, level, icon, description)
├── repository/medal/
│   └── medal_repository.ts      # CRUD + findByLevel()
├── services/medal/
│   └── medal_service.ts         # Business logic + Cloudinary integration
├── controllers/medal/
│   └── medal_controller.ts      # Request validation + response formatting
├── router/
│   └── medal_routes.ts          # Standalone router mounted at /api/medals
└── server.ts                    # app.use("/api/medals", MedalRouter)
```

### Affected Existing Files

| File | Change |
| :--- | :--- |
| `src/core/Utils/enums.ts` | Added `Medals` to `DatabaseNames`, `MedalAssets` to `CloudinaryFolder` |
| `src/models/user/user_model.ts` | Added `earnedMedals[]` schema field |
| `src/entities/user_entity.ts` | Maps `earnedMedals` with safe populated/unpopulated handling |
| `src/core/helper_classes/xp_helper.ts` | Auto-awards medals on level-up using atomic `$ne + $push` |
| `src/services/auth/auth_services.ts` | Populates `earnedMedals.medalId` in user detail responses |

---

## Part 7: Implementation Notes

- **Level-up only**: Medals are awarded **only when the user's level increases**, not on every XP update.
- **Non-atomic retroactive**: The retroactive endpoint runs one `updateMany` per medal sequentially (not in a transaction). It is safe to re-run — the `$ne` filter prevents duplicates.
- **Icon swap safety**: `updateMedal` uploads the new icon to Cloudinary **before** deleting the old one. If the upload fails, the old icon is preserved.
- **Cleanup on delete**: `deleteMedal` removes the medal from all users' `earnedMedals` arrays via `$pull` before deleting the medal document itself.
- **Profile population**: User details endpoints (`retrieveMyDetails`, `retrieveUserDetails`) use `.populate("earnedMedals.medalId")` to return full medal objects in API responses.
