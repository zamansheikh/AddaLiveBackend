# Coin Exchange API Documentation

The **Coin Exchange System** allows users to convert their accumulated in-game/app **Coins** to premium **Diamonds**. This system provides robust features, including administrative management of exchange packages, strict validation checks, history tracking, and idempotency protection to prevent duplicate transactions caused by network retries.

---

## Global Authentication and Request Format

* **Base URL**: `/api/coin-exchange`
* **Request Headers**: All endpoints except public options retrieval require standard JWT Authentication.
  ```http
  Authorization: Bearer <your_jwt_token_here>
  Content-Type: application/json
  ```
* **Roles**:
  * `Admin`: Allows write operations (creating, updating, deleting options) and viewing global transaction histories.
  * `User` (or any authenticated role): Allows viewing available options, initiating exchange transactions, and viewing their own transaction history.

---

## 1. Exchange Options Management (Admin API)

### 1.1 Create Exchange Option
Creates a new exchange package (e.g. convert 100 coins into 10 base diamonds + 2 bonus diamonds).

* **Path**: `POST /`
* **Access Control**: `Admin` only
* **Summary**: Adds a new, unique exchange tier that users can select.
* **Why fields are sent**:
  * `coinsRequired`: The amount of coins deducted from the user's wallet. (Must be positive and unique).
  * `diamondsAwarded`: The baseline premium diamonds the user will receive. (Must be positive).
  * `bonusDiamonds`: Additional promotional/bonus diamonds awarded for this specific package. (Optional, defaults to 0).
  * `isActive`: Activates or deactivates the package. (Optional, defaults to true).
  * `displayOrder`: Controls sorting on the frontend UI. (Must be non-negative and unique).

* **Example Request Payload**:
  ```json
  {
    "coinsRequired": 1000,
    "diamondsAwarded": 100,
    "bonusDiamonds": 10,
    "isActive": true,
    "displayOrder": 1
  }
  ```

* **Example Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": null,
    "meta": null,
    "result": {
      "_id": "603d76e73f3248386c91a32a",
      "coinsRequired": 1000,
      "diamondsAwarded": 100,
      "bonusDiamonds": 10,
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

### 1.2 Update Exchange Option
Modifies an existing exchange package.

* **Path**: `PUT /:id`
* **Access Control**: `Admin` only
* **Summary**: Updates details of an exchange option. Only modified fields need to be supplied.
* **Why fields are sent**:
  * `id` (in route): Identifies which exchange option to edit.
  * Fields in body: Partially updates any option values (re-ordering, adjustments to payout, or activation).

* **Example Request Payload**:
  ```json
  {
    "bonusDiamonds": 15,
    "isActive": false
  }
  ```

* **Example Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": null,
    "meta": null,
    "result": {
      "_id": "603d76e73f3248386c91a32a",
      "coinsRequired": 1000,
      "diamondsAwarded": 100,
      "bonusDiamonds": 15,
      "isActive": false,
      "displayOrder": 1,
      "createdAt": "2026-05-20T11:00:00.000Z",
      "updatedAt": "2026-05-20T11:05:00.000Z",
      "__v": 0
    },
    "access_token": null
  }
  ```

---

### 1.3 Delete Exchange Option
Deletes an exchange option.

* **Path**: `DELETE /:id`
* **Access Control**: `Admin` only
* **Summary**: Permanently removes an exchange package from the DB.
* **Why fields are sent**:
  * `id` (in route): Unique Mongoose ID of the exchange option to delete.

* **Example Response (200 OK)**:
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

## 2. Exchange Packages & Transaction Execution (User API)

### 2.1 Get All Available Options
Fetches list of all exchange options.

* **Path**: `GET /`
* **Access Control**: Authenticated `User` or `Admin`
* **Summary**: Fetches all available exchange packages to populate the conversion shop UI. Sorted by `displayOrder` or database index.

* **Example Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": null,
    "meta": null,
    "result": [
      {
        "_id": "603d76e73f3248386c91a32a",
        "coinsRequired": 500,
        "diamondsAwarded": 50,
        "bonusDiamonds": 0,
        "isActive": true,
        "displayOrder": 0,
        "createdAt": "2026-05-20T10:00:00.000Z",
        "updatedAt": "2026-05-20T10:00:00.000Z",
        "__v": 0
      },
      {
        "_id": "603d76e73f3248386c91a32b",
        "coinsRequired": 1000,
        "diamondsAwarded": 100,
        "bonusDiamonds": 15,
        "isActive": true,
        "displayOrder": 1,
        "createdAt": "2026-05-20T11:00:00.000Z",
        "updatedAt": "2026-05-20T11:05:00.000Z",
        "__v": 0
      }
    ],
    "access_token": null
  }
  ```

---

### 2.2 Execute Coin to Diamond Exchange
Exchanges a user's coins to diamonds securely.

* **Path**: `POST /exchange`
* **Access Control**: Authenticated `User`
* **Summary**: Subtracts `coinsRequired` from the user's statistics, adds `diamondsAwarded + bonusDiamonds` to their wallet, and creates an audit transaction log in the database.
* **Why fields are sent**:
  * `optionId`: Specifies the chosen package. The backend loads coinsRequired and award amounts directly from this database ID to prevent frontend tampering (e.g. client sending forged diamond values).
  * `idempotencyKey`: A unique UUID generated by the frontend. In case of poor network, if the client sends duplicate retry requests, the backend matches this key and returns the identical transaction immediately without double-deducting coins or double-awarding diamonds.

* **Example Request Payload**:
  ```json
  {
    "optionId": "603d76e73f3248386c91a32a",
    "idempotencyKey": "a821e257-ec23-455b-b9f4-18fa8f9ffea5"
  }
  ```

* **Example Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": null,
    "meta": null,
    "result": {
      "_id": "603d80a13f3248386c91a355",
      "userId": "507f1f77bcf86cd799439011",
      "exchangeOptionId": "603d76e73f3248386c91a32a",
      "coinsDeducted": 500,
      "diamondsAwarded": 50,
      "bonusDiamonds": 0,
      "idempotencyKey": "a821e257-ec23-455b-b9f4-18fa8f9ffea5",
      "createdAt": "2026-05-20T11:10:00.000Z",
      "updatedAt": "2026-05-20T11:10:00.000Z",
      "__v": 0
    },
    "access_token": null
  }
  ```

---

## 3. Transaction History APIs

### 3.1 Get My Transaction History
Retrieves past transactions for the logged-in user.

* **Path**: `GET /my-history`
* **Access Control**: Authenticated `User`
* **Summary**: Fetches all successful conversions that the current user has ever completed.
* **Why fields are sent**: No request body. The user ID is retrieved automatically from the JWT authorization token, ensuring users cannot view or scrape other users' histories.

* **Example Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": null,
    "meta": null,
    "result": [
      {
        "_id": "603d80a13f3248386c91a355",
        "userId": "507f1f77bcf86cd799439011",
        "exchangeOptionId": "603d76e73f3248386c91a32a",
        "coinsDeducted": 500,
        "diamondsAwarded": 50,
        "bonusDiamonds": 0,
        "idempotencyKey": "a821e257-ec23-455b-b9f4-18fa8f9ffea5",
        "createdAt": "2026-05-20T11:10:00.000Z",
        "updatedAt": "2026-05-20T11:10:00.000Z",
        "__v": 0
      }
    ],
    "access_token": null
  }
  ```

---

### 3.2 Get Global Transaction History (Admin API)
Retrieves past transactions for all users.

* **Path**: `GET /history`
* **Access Control**: `Admin` only
* **Summary**: Allows system admins to retrieve the full list of all currency exchanges occurring on the platform for auditing, reporting, and analysis purposes.

* **Example Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": null,
    "meta": null,
    "result": [
      {
        "_id": "603d80a13f3248386c91a355",
        "userId": "507f1f77bcf86cd799439011",
        "exchangeOptionId": "603d76e73f3248386c91a32a",
        "coinsDeducted": 500,
        "diamondsAwarded": 50,
        "bonusDiamonds": 0,
        "idempotencyKey": "a821e257-ec23-455b-b9f4-18fa8f9ffea5",
        "createdAt": "2026-05-20T11:10:00.000Z",
        "updatedAt": "2026-05-20T11:10:00.000Z",
        "__v": 0
      },
      {
        "_id": "603d80b93f3248386c91a361",
        "userId": "507f1f77bcf86cd799439099",
        "exchangeOptionId": "603d76e73f3248386c91a32b",
        "coinsDeducted": 1000,
        "diamondsAwarded": 100,
        "bonusDiamonds": 15,
        "idempotencyKey": "b932c124-dcf3-412f-981c-f230d0a512ac",
        "createdAt": "2026-05-20T11:12:00.000Z",
        "updatedAt": "2026-05-20T11:12:00.000Z",
        "__v": 0
      }
    ],
    "access_token": null
  }
  ```

---

## 4. Key Error Handlers & Status Codes

The backend responds with standardized JSON errors when rules are violated:

* **`400 Bad Request`**: Sent when input parameters are missing or invalid (e.g. negative coin cost, inactive package selected, or insufficient coin balances in user's profile).
  ```json
  {
    "success": false,
    "message": "Insufficient coins balance",
    "meta": null,
    "result": null,
    "access_token": null
  }
  ```
* **`401 Unauthorized`**: Authorization header is missing, malformed, or contains an expired token.
  ```json
  {
    "success": false,
    "message": "Invalid or expired token",
    "meta": null,
    "result": null,
    "access_token": null
  }
  ```
* **`403 Forbidden`**: User has authenticated successfully, but does not possess the `admin` role required for write actions.
  ```json
  {
    "success": false,
    "message": "Access denied: insufficient role",
    "meta": null,
    "result": null,
    "access_token": null
  }
  ```
* **`404 Not Found`**: The provided exchange option `_id` is invalid or not registered in the system.
  ```json
  {
    "success": false,
    "message": "Exchange option not found",
    "meta": null,
    "result": null,
    "access_token": null
  }
  ```
* **`409 Conflict`**: An item with the given `displayOrder` or `coinsRequired` value already exists, or there is a database-level concurrency conflict.
  ```json
  {
    "success": false,
    "message": "An exchange option requiring 1000 coins already exists",
    "meta": null,
    "result": null,
    "access_token": null
  }
  ```
