# Agora Configuration API Documentation

The **Agora Configuration System** allows the admin to manage Agora App settings used for real-time audio/video communication (voice rooms, live streaming, etc.). Admins can store and manage Agora credentials and default token parameters via CRUD operations.

---

## Global Authentication and Request Format

- **Base URL**: `/api/admin/agora-config`
- **Request Headers**: All endpoints require standard JWT Authentication.
  ```http
  Authorization: Bearer <your_jwt_token_here>
  Content-Type: application/json
  ```
- **Roles**:
  - `Admin`: Full CRUD access (create, read, update, delete).
  - No other roles have access to this feature.

---

## 1. Manage Agora Configuration (Admin API)

### 1.1 Create Agora Configuration

Creates a new Agora configuration entry with app credentials and default token parameters.

- **Path**: `POST /`
- **Access Control**: `Admin` only
- **Summary**: Adds a new Agora configuration to the database.

**Validation Rules**:
- `appId` — Required, must be a non-empty string (Agora App ID).
- `appCertificate` — Required, must be a non-empty string (Agora App Certificate).
- `defaultChannel` — Required, must be a non-empty string (default channel name for token generation).
- `defaultUid` — Required, must be a non-negative number. **Note**: `0` is accepted as a valid UID (see implementation notes).
- `defaultRole` — Required, must be a non-empty string (e.g. `"publisher"`, `"subscriber"`, `"admin"`).
- `tokenExpiry` — Required, must be a positive number (expiration time in seconds).

- **Example Request Payload**:
  ```json
  {
    "appId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "appCertificate": "your_agora_app_certificate_here",
    "defaultChannel": "main-lobby",
    "defaultUid": 0,
    "defaultRole": "publisher",
    "tokenExpiry": 3600
  }
  ```

- **Example Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": null,
    "meta": null,
    "result": {
      "_id": "603d76e73f3248386c91a32a",
      "appId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
      "appCertificate": "your_agora_app_certificate_here",
      "defaultChannel": "main-lobby",
      "defaultUid": 0,
      "defaultRole": "publisher",
      "tokenExpiry": 3600,
      "createdAt": "2026-05-26T10:00:00.000Z",
      "updatedAt": "2026-05-26T10:00:00.000Z",
      "__v": 0
    },
    "access_token": null
  }
  ```

---

### 1.2 Get All Agora Configurations

Fetches all stored Agora configurations.

- **Path**: `GET /`
- **Access Control**: `Admin` only
- **Summary**: Returns all Agora configurations sorted by most recently created first.

- **Example Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": null,
    "meta": null,
    "result": [
      {
        "_id": "603d76e73f3248386c91a32a",
        "appId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        "appCertificate": "your_agora_app_certificate_here",
        "defaultChannel": "main-lobby",
        "defaultUid": 0,
        "defaultRole": "publisher",
        "tokenExpiry": 3600,
        "createdAt": "2026-05-26T10:00:00.000Z",
        "updatedAt": "2026-05-26T10:00:00.000Z",
        "__v": 0
      }
    ],
    "access_token": null
  }
  ```

---

### 1.3 Get Agora Configuration by ID

Retrieves a single Agora configuration by its MongoDB ObjectId.

- **Path**: `GET /:id`
- **Access Control**: `Admin` only
- **Summary**: Fetches a specific configuration entry for detailed viewing or editing.

**Why fields are sent**:
- `id` (in route) — MongoDB ObjectId of the configuration to retrieve.

- **Example Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": null,
    "meta": null,
    "result": {
      "_id": "603d76e73f3248386c91a32a",
      "appId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
      "appCertificate": "your_agora_app_certificate_here",
      "defaultChannel": "main-lobby",
      "defaultUid": 0,
      "defaultRole": "publisher",
      "tokenExpiry": 3600,
      "createdAt": "2026-05-26T10:00:00.000Z",
      "updatedAt": "2026-05-26T10:00:00.000Z",
      "__v": 0
    },
    "access_token": null
  }
  ```

---

### 1.4 Update Agora Configuration

Modifies an existing Agora configuration entry.

- **Path**: `PUT /:id`
- **Access Control**: `Admin` only
- **Summary**: Updates fields of an Agora configuration. Only modified fields need to be supplied (partial update).

**Validation Rules**:
- `id` (in route) — Must be a valid MongoDB ObjectId.
- `appId` — If provided, must be a non-empty string.
- `appCertificate` — If provided, must be a non-empty string.
- `defaultChannel` — If provided, must be a non-empty string.
- `defaultUid` — If provided, must be a non-negative number.
- `defaultRole` — If provided, must be a non-empty string.
- `tokenExpiry` — If provided, must be a positive number.
- At least one field to update is required.

- **Example Request Payload**:
  ```json
  {
    "defaultChannel": "voice-room-alpha",
    "tokenExpiry": 7200
  }
  ```

- **Example Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": null,
    "meta": null,
    "result": {
      "_id": "603d76e73f3248386c91a32a",
      "appId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
      "appCertificate": "your_agora_app_certificate_here",
      "defaultChannel": "voice-room-alpha",
      "defaultUid": 0,
      "defaultRole": "publisher",
      "tokenExpiry": 7200,
      "createdAt": "2026-05-26T10:00:00.000Z",
      "updatedAt": "2026-05-26T10:05:00.000Z",
      "__v": 0
    },
    "access_token": null
  }
  ```

---

### 1.5 Delete Agora Configuration

Permanently removes an Agora configuration from the database.

- **Path**: `DELETE /:id`
- **Access Control**: `Admin` only
- **Summary**: Deletes a configuration entry by its MongoDB ID.

**Why fields are sent**:
- `id` (in route) — MongoDB ObjectId of the configuration to delete.

- **Example Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": null,
    "meta": null,
    "result": true,
    "access_token": null
  }
  ```

---

## 2. Data Model Reference

### MongoDB Collection: `agora_configs`

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Auto | MongoDB unique identifier |
| `appId` | `String` | Yes | Agora App ID (e.g. `"a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"`) |
| `appCertificate` | `String` | Yes | Agora App Certificate (secret key for token generation) |
| `defaultChannel` | `String` | Yes | Default channel name for token generation (e.g. `"main-lobby"`) |
| `defaultUid` | `Number` | Yes | Default user ID for token generation (non-negative integer, `0` allowed) |
| `defaultRole` | `String` | Yes | Default role for tokens (e.g. `"publisher"`, `"subscriber"`, `"admin"`) |
| `tokenExpiry` | `Number` | Yes | Token expiration time in seconds (must be > 0, e.g. `3600` for 1 hour) |
| `createdAt` | `Date` | Auto | Timestamp from Mongoose `timestamps: true` |
| `updatedAt` | `Date` | Auto | Timestamp from Mongoose `timestamps: true` |

---

## 3. Endpoints Summary

| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/admin/agora-config` | Admin | Create a new Agora configuration |
| `GET` | `/api/admin/agora-config` | Admin | Get all Agora configurations |
| `GET` | `/api/admin/agora-config/:id` | Admin | Get a single configuration by ID |
| `PUT` | `/api/admin/agora-config/:id` | Admin | Update an existing configuration |
| `DELETE` | `/api/admin/agora-config/:id` | Admin | Delete a configuration |

---

## 4. Key Error Handlers & Status Codes

The backend responds with standardized JSON errors when validation rules are violated:

- **`400 Bad Request`** — Input parameters are missing or invalid (e.g. empty appId, negative tokenExpiry, all fields undefined on update).
  ```json
  {
    "success": false,
    "message": "appId is required",
    "meta": null,
    "result": null,
    "access_token": null
  }
  ```

- **`401 Unauthorized`** — Authorization header is missing, malformed, or contains an expired token.
  ```json
  {
    "success": false,
    "message": "Invalid or expired token",
    "meta": null,
    "result": null,
    "access_token": null
  }
  ```

- **`403 Forbidden`** — User has authenticated successfully, but does not possess the `Admin` role required for this endpoint.
  ```json
  {
    "success": false,
    "message": "Access denied: insufficient role",
    "meta": null,
    "result": null,
    "access_token": null
  }
  ```

- **`404 Not Found`** — The provided configuration `_id` is invalid or does not exist in the system.
  ```json
  {
    "success": false,
    "message": "Agora configuration not found",
    "meta": null,
    "result": null,
    "access_token": null
  }
  ```

---

## 5. Implementation Notes

- **Multiple Configurations**: Unlike some single-config features (e.g., GiftAudioRocket), this system allows storing multiple Agora configurations. Each entry is independent, enabling support for multiple Agora projects or environments (development/staging/production).
- **Sensitive Data**: The `appCertificate` field stores the Agora App Certificate which is a secret key used for token generation. Ensure this data is transmitted over HTTPS and access is restricted to trusted admin accounts only.
- **`defaultUid: 0`**: A `defaultUid` value of `0` is accepted and valid. When using Agora's token-based authentication, `uid: 0` instructs the Agora SDK to automatically assign a UID to the user upon joining the channel.
- **Token Expiry**: `tokenExpiry` is specified in seconds. Common values include `3600` (1 hour), `7200` (2 hours), or `86400` (24 hours). Choose a value appropriate for your session duration requirements.
- **Role Values**: The `defaultRole` field accepts any string, but common Agora roles include:
  - `"publisher"` — Can publish audio/video and subscribe to streams (host role).
  - `"subscriber"` — Can only subscribe to streams (audience role).
  - `"admin"` — Administrative role with additional privileges.
