# Coin Purchase Option API Documentation

The **Coin Purchase Option System** allows the admin to manage in-app coin packages that will be displayed to users for purchase (future Google Play Billing integration). This phase covers only the **admin CRUD** and the **public display endpoint** — actual purchasing via Google IAP is not yet implemented.

---

## Global Authentication and Request Format

- **Base URL**: `/api/coin-purchase`
- **Request Headers**: All endpoints require standard JWT Authentication.
  ```http
  Authorization: Bearer <your_jwt_token_here>
  Content-Type: application/json
  ```
- **Roles**:
  - `Admin` / `SubAdmin`: Allows write operations (creating, updating, deleting options).
  - `User` (or any authenticated role): Allows reading the available purchase options for display.

---

## 1. Manage Purchase Options (Admin / SubAdmin API)

### 1.1 Create Purchase Option

Creates a new coin purchase package (e.g. a pack of 100 coins for $1.99).

- **Path**: `POST /`
- **Access Control**: `Admin` or `SubAdmin`
- **Summary**: Adds a new, unique coin purchase option that the app can display in its shop UI.

**Validation Rules**:
- `productId` — Required, must be non-empty, must be unique across all options (Google Play product ID, e.g. `"coin_pack_100"`).
- `coinAmount` — Required, must be a positive number (the base coins the user will receive).
- `bonusCoins` — Optional, defaults to `0`, must be non-negative (bonus/promotional coins).
- `price` — Required, must be a positive number (display price for the app UI).
- `currency` — Optional, defaults to `"USD"`, trimmed (e.g. `"USD"`, `"EUR"`, `"BDT"`).
- `isActive` — Optional, defaults to `true` (toggle to show/hide from users).
- `displayOrder` — Required, must be non-negative and unique (controls sorting in the frontend).

- **Example Request Payload**:
  ```json
  {
    "productId": "coin_pack_100",
    "coinAmount": 100,
    "bonusCoins": 10,
    "price": 1.99,
    "currency": "USD",
    "isActive": true,
    "displayOrder": 1
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
      "productId": "coin_pack_100",
      "coinAmount": 100,
      "bonusCoins": 10,
      "price": 1.99,
      "currency": "USD",
      "isActive": true,
      "displayOrder": 1,
      "createdAt": "2026-05-20T11:00:00.000Z",
      "updatedAt": "2026-05-20T11:00:00.000Z",
      "__v": 0
    },
    "access_token": null
  }
  ```

---

### 1.2 Update Purchase Option

Modifies an existing coin purchase package.

- **Path**: `PUT /:id`
- **Access Control**: `Admin` or `SubAdmin`
- **Summary**: Updates details of a purchase option. Only modified fields need to be supplied (partial update).

**Validation Rules**:
- `id` (in route) — Must be a valid MongoDB ObjectId.
- `productId` — If provided, must be non-empty and unique (excluding the option being updated itself).
- `coinAmount` — If provided, must be a positive number.
- `bonusCoins` — If provided, must be non-negative.
- `price` — If provided, must be a positive number.
- `displayOrder` — If provided, must be non-negative and unique (excluding the option being updated itself).
- At least one field to update is required.

- **Example Request Payload**:
  ```json
  {
    "bonusCoins": 20,
    "price": 2.99
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
      "productId": "coin_pack_100",
      "coinAmount": 100,
      "bonusCoins": 20,
      "price": 2.99,
      "currency": "USD",
      "isActive": true,
      "displayOrder": 1,
      "createdAt": "2026-05-20T11:00:00.000Z",
      "updatedAt": "2026-05-20T11:05:00.000Z",
      "__v": 0
    },
    "access_token": null
  }
  ```

---

### 1.3 Delete Purchase Option

Permanently removes a coin purchase package from the database.

- **Path**: `DELETE /:id`
- **Access Control**: `Admin` or `SubAdmin`
- **Summary**: Deletes a purchase option by its MongoDB ID.

**Why fields are sent**:
- `id` (in route) — Unique MongoDB ObjectId of the purchase option to delete.

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

## 2. Display Purchase Options (User API)

### 2.1 Get All Purchase Options

Fetches list of all coin purchase packages for display in the app's shop UI.

- **Path**: `GET /`
- **Access Control**: Authenticated `User` or `Admin`
- **Summary**: Returns all purchase options sorted by `displayOrder` ascending. The app can filter client-side by `isActive` or use the full list for admin management.

- **Example Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": null,
    "meta": null,
    "result": [
      {
        "_id": "603d76e73f3248386c91a32a",
        "productId": "coin_pack_100",
        "coinAmount": 100,
        "bonusCoins": 0,
        "price": 0.99,
        "currency": "USD",
        "isActive": true,
        "displayOrder": 0,
        "createdAt": "2026-05-20T10:00:00.000Z",
        "updatedAt": "2026-05-20T10:00:00.000Z",
        "__v": 0
      },
      {
        "_id": "603d76e73f3248386c91a32b",
        "productId": "coin_pack_500",
        "coinAmount": 500,
        "bonusCoins": 50,
        "price": 4.99,
        "currency": "USD",
        "isActive": true,
        "displayOrder": 1,
        "createdAt": "2026-05-20T11:00:00.000Z",
        "updatedAt": "2026-05-20T11:05:00.000Z",
        "__v": 0
      },
      {
        "_id": "603d76e73f3248386c91a32c",
        "productId": "coin_pack_1000",
        "coinAmount": 1000,
        "bonusCoins": 150,
        "price": 9.99,
        "currency": "USD",
        "isActive": false,
        "displayOrder": 2,
        "createdAt": "2026-05-20T12:00:00.000Z",
        "updatedAt": "2026-05-20T12:00:00.000Z",
        "__v": 0
      }
    ],
    "access_token": null
  }
  ```

---

## 3. Data Model Reference

### MongoDB Collection: `coin_purchase_options`

| Field | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Auto | — | MongoDB unique identifier |
| `productId` | `String` | Yes | — | Google Play product ID (unique, e.g. `"coin_pack_100"`) |
| `coinAmount` | `Number` | Yes | — | Base coin amount the user receives (must be > 0) |
| `bonusCoins` | `Number` | Yes | `0` | Bonus/promotional coins awarded (must be ≥ 0) |
| `price` | `Number` | Yes | — | Display price for the app UI (must be > 0) |
| `currency` | `String` | Yes | `"USD"` | Currency code (e.g. `"USD"`, `"EUR"`, `"BDT"`) |
| `isActive` | `Boolean` | Yes | `true` | Whether the option is active and should be shown to users |
| `displayOrder` | `Number` | Yes | — | Sort order for the frontend UI (non-negative, unique) |
| `createdAt` | `Date` | Auto | — | Timestamp from Mongoose `timestamps: true` |
| `updatedAt` | `Date` | Auto | — | Timestamp from Mongoose `timestamps: true` |

---

## 4. Key Error Handlers & Status Codes

The backend responds with standardized JSON errors when validation rules are violated:

- **`400 Bad Request`** — Input parameters are missing or invalid (e.g. negative coin amount, empty productId).
  ```json
  {
    "success": false,
    "message": "coinAmount must be a positive number",
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

- **`403 Forbidden`** — User has authenticated successfully, but does not possess the required role (Admin/SubAdmin) for write actions.
  ```json
  {
    "success": false,
    "message": "Access denied: insufficient role",
    "meta": null,
    "result": null,
    "access_token": null
  }
  ```

- **`404 Not Found`** — The provided purchase option `_id` is invalid or not registered in the system.
  ```json
  {
    "success": false,
    "message": "Coin purchase option not found",
    "meta": null,
    "result": null,
    "access_token": null
  }
  ```

- **`409 Conflict`** — An option with the given `productId` or `displayOrder` value already exists.
  ```json
  {
    "success": false,
    "message": "A purchase option with productId \"coin_pack_100\" already exists",
    "meta": null,
    "result": null,
    "access_token": null
  }
  ```

---

## 5. Implementation Notes

- **Product ID Convention**: `productId` is designed to align with Google Play's in-app product IDs (e.g., `"coin_pack_100"`, `"coin_pack_500"`). Choose a consistent naming scheme for your Google Play Console products.
- **Display Order**: The `GET /` endpoint returns all options sorted by `displayOrder` ascending. The frontend should use this field for consistent UI ordering.
- **Active Filtering**: While the backend returns all options via `GET /`, the frontend can filter client-side by `isActive: true` to show only purchasable items. An upcoming `GET /active` endpoint may be added if required.
- **Future IAP Integration**: When Google Play Billing is implemented, `productId` will be used to match in-app products from the Google Play Console. The flow will be: app fetches options → presents them to user → user selects → app initiates Google Play purchase → backend verifies receipt → coins are credited.
