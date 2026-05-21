# Admin & Portal User API Documentation

The **Admin & Portal User System** provides backend management capabilities for platform administrators and delegated management roles (SubAdmin, Merchant, Reseller, Agency, etc.). This system covers role creation, user management, coin distribution, gift management, salary management, banner/poster management, and more.

---

## Global Authentication & Request Format

* **Base URLs**: 
  * `/api/admin` — Super Admin endpoints
  * `/api/portal-user` — Portal User (SubAdmin, Merchant, Agency, etc.) endpoints
* **Headers**:
  ```http
  Authorization: Bearer <your_jwt_token_here>
  Content-Type: application/json
  ```
* **File Upload Endpoints**: Use `multipart/form-data` for endpoints requiring file uploads (gifts, banners, posters, avatars, level tags). These are noted per endpoint.

---

## User Roles & Hierarchy

```
Admin (god-mode)
├── SubAdmin
│   ├── Merchant
│   │   └── Reseller
│   ├── CountryAdmin
│   │   └── countrySubAdmin
│   └── Agency
│       └── Host (regular user promoted to host)
└── User
```

**Available Roles** (`UserRoles`):
| Role | Value | Description |
| :--- | :--- | :--- |
| `Admin` | `admin` | Super admin (only one account in the system) |
| `SubAdmin` | `sub-admin` | Upper management, can create roles and manage users |
| `Merchant` | `merchant` | Mid management |
| `Reseller` | `re-seller` | Lower management (must have a Merchant as parentCreator) |
| `Agency` | `agency` | Manages hosts, promotes/demotes users |
| `CountryAdmin` | `country-admin` | Country-level management |
| `countrySubAdmin` | `country-sub-admin` | Sub-country management (must have a CountryAdmin as parentCreator) |
| `Host` | `host` | Promoted user who can host audio rooms |
| `User` | `user` | Regular platform user |

**Available Permissions** (`AdminPowers`):
| Permission | Value | Description |
| :--- | :--- | :--- |
| `CoinDistribute` | `coin-distributor` | Can assign coins to users |
| `PromoteUser` | `promote-user` | Can promote/demote users |
| `UpdateUsers` | `update-users` | Can update user info |
| `BlockUser` | `block-user` | Can block users |
| `DeviceBan` | `device-ban` | Can ban devices |
| `LiveRoomClose` | `live-room-close` | Can close live rooms |
| `CreateUserAccount` | `create-user-account` | Can create user accounts |

---

## 1. Admin Authentication & Profile

### 1.1 Register Admin

Creates the **single** platform admin account. Only one admin can exist in the system.

* **Path**: `POST /api/admin/auth`
* **Access Control**: Public

**Request Body**:
```json
{
  "username": "admin",
  "password": "secure_password",
  "email": "admin@example.com"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "result": {
    "_id": "60d5ec49f1b2c51f4c8b4567",
    "username": "admin",
    "email": "admin@example.com",
    "coins": 0,
    "createdAt": "2026-05-20T10:00:00.000Z",
    "updatedAt": "2026-05-20T10:00:00.000Z"
  },
  "message": "Admin registered successfully"
}
```

**Error — Admin Already Exists (409)**:
```json
{
  "success": false,
  "message": "You cannot have more than one admin"
}
```

---

### 1.2 Login Admin

* **Path**: `POST /api/admin/login`
* **Access Control**: Public

**Request Body**:
```json
{
  "username": "admin",
  "password": "secure_password"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "result": [
    {
      "_id": "60d5ec49f1b2c51f4c8b4567",
      "username": "admin",
      "email": "admin@example.com",
      "coins": 0,
      "avatar": "https://...",
      "createdAt": "2026-05-20T10:00:00.000Z",
      "updatedAt": "2026-05-20T10:00:00.000Z"
    }
  ],
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "message": "Admin logged in successfully"
}
```

**Error — Invalid Credentials (401)**:
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

---

### 1.3 Get Admin Profile

* **Path**: `GET /api/admin/auth`
* **Access Control**: `Admin` only

**Response (200 OK)**:
```json
{
  "success": true,
  "result": {
    "_id": "60d5ec49f1b2c51f4c8b4567",
    "username": "admin",
    "email": "admin@example.com",
    "coins": 50000,
    "avatar": "https://res.cloudinary.com/...",
    "createdAt": "2026-05-20T10:00:00.000Z",
    "updatedAt": "2026-05-20T10:00:00.000Z"
  },
  "message": "Admin profile retrieved successfully"
}
```

---

### 1.4 Update Admin Profile

* **Path**: `PUT /api/admin/auth`
* **Access Control**: `Admin` only
* **Content-Type**: `multipart/form-data`

**Form Fields**:
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `username` | `string` | No | New username |
| `password` | `string` | No | New password (will be bcrypt hashed) |
| `email` | `string` | No | New email |
| `avatar` | `file` | No | Avatar image file |

**Note**: `coins` and `role` fields are rejected with `403 Forbidden`.

**Response (200 OK)**:
```json
{
  "success": true,
  "result": { "...updated admin object..." },
  "message": "Admin updated successfully"
}
```

---

### 1.5 Delete Admin

* **Path**: `DELETE /api/admin/auth`
* **Access Control**: `Admin` only

**Response (200 OK)**:
```json
{
  "success": true,
  "result": { "...deleted admin object..." },
  "message": "Admin deleted successfully"
}
```

---

### 1.6 Assign Coins to Self (Admin)

* **Path**: `PUT /api/admin/auth/assign-coin`
* **Access Control**: `Admin` only

**Request Body**:
```json
{
  "coins": 10000
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "result": {
    "_id": "60d5ec49f1b2c51f4c8b4567",
    "coins": 60000,
    "...": "..."
  },
  "message": "Coins assigned to user successfully"
}
```

---

## 2. Portal User Authentication

### 2.1 Login Portal User

Portal users (SubAdmin, Merchant, Reseller, Agency, CountryAdmin, countrySubAdmin) log in here.

* **Path**: `POST /api/portal-user/auth`
* **Access Control**: Public

**Request Body**:
```json
{
  "userId": "subadmin_123",
  "password": "secure_password"
}
```

**Response (202 Accepted)**:
```json
{
  "success": true,
  "result": {
    "_id": "60d5ec49f1b2c51f4c8b4567",
    "userId": "subadmin_123",
    "name": "John SubAdmin",
    "userRole": "sub-admin",
    "userPermissions": ["coin-distributor", "promote-user"],
    "coins": 100000,
    "diamonds": 5000,
    "...": "..."
  },
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "message": "loggged in successfully"
}
```

**Error — Blocked Account (403)**:
```json
{
  "success": false,
  "message": "Your account is temporarily blocked till Sat May 30 2026"
}
```

---

### 2.2 Get My Profile (Portal User)

* **Path**: `GET /api/portal-user/auth`
* **Access Control**: Authenticated portal user (SubAdmin, Merchant, Reseller, countrySubAdmin, CountryAdmin, Agency)

**Response (200 OK)**:
```json
{
  "success": true,
  "result": { "...profile object..." },
  "message": "profile retrieved succesfully"
}
```

---

### 2.3 Update My Profile (Portal User)

* **Path**: `PUT /api/portal-user/auth`
* **Access Control**: Authenticated portal user
* **Content-Type**: `multipart/form-data`

**Form Fields**:
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `password` | `string` | No | New password |
| `name` | `string` | No | New display name |
| `avatar` | `file` | No | Avatar image file |

**Response (200 OK)**:
```json
{
  "success": true,
  "result": { "...updated profile..." },
  "message": "profile updated succesfully"
}
```

---

## 3. Role (Portal User) Management — Admin

### 3.1 Create Role

Creates a new portal user (SubAdmin, Merchant, Reseller, Agency, CountryAdmin, countrySubAdmin).

* **Path**: `POST /api/admin/create-role`
* **Access Control**: `Admin` or `SubAdmin`

**Important Role Requirements**:
| Target Role | parentCreator Required? | parentCreator Must Be |
| :--- | :--- | :--- |
| `SubAdmin` | No | — |
| `Merchant` | No | — |
| `Reseller` | **Yes** | `Merchant` |
| `Agency` | **Yes** | `SubAdmin` |
| `CountryAdmin` | No | — |
| `countrySubAdmin` | **Yes** | `CountryAdmin` |

**Request Body**:
```json
{
  "name": "John Merchant",
  "userId": "merchant_001",
  "password": "secure_password",
  "designation": "Regional Merchant",
  "userRole": "merchant",
  "parentCreator": "60d5ec49f1b2c51f4c8b4567",
  "userPermissions": ["coin-distributor"]
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "result": {
    "_id": "60d5ec49f1b2c51f4c8b4568",
    "name": "John Merchant",
    "userId": "merchant_001",
    "userRole": "merchant",
    "designation": "Regional Merchant",
    "parentCreator": "60d5ec49f1b2c51f4c8b4567",
    "userPermissions": ["coin-distributor"],
    "coins": 0,
    "diamonds": 0,
    "createdAt": "2026-05-20T10:00:00.000Z",
    "updatedAt": "2026-05-20T10:00:00.000Z"
  },
  "message": "Role created successfully"
}
```

**Error — Duplicate userId (409)**:
```json
{
  "success": false,
  "message": "UserId -> merchant_001 already exists"
}
```

**Roles that CANNOT be created via this endpoint**: `Admin`, `User`, `Host`

---

### 3.2 Get Role Details

* **Path**: `GET /api/admin/role/:roleId`
* **Access Control**: `Admin` only

**Response (200 OK)**:
```json
{
  "success": true,
  "result": { "...portal user object..." },
  "message": "Role details retrieved successfully"
}
```

---

### 3.3 Delete Role

* **Path**: `DELETE /api/admin/role/:roleId`
* **Access Control**: `Admin` only

**Response (200 OK)**:
```json
{
  "success": true,
  "result": { "...deleted portal user object..." },
  "message": "Role deleted successfully"
}
```

---

### 3.4 Add Permissions to Role

* **Path**: `PUT /api/admin/role/permissions/add/:roleId`
* **Access Control**: `Admin` only

**Request Body**:
```json
{
  "permissions": ["coin-distributor", "promote-user"]
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "result": {
    "_id": "60d5ec49f1b2c51f4c8b4568",
    "userPermissions": ["coin-distributor", "promote-user"],
    "...": "..."
  },
  "message": "Permissions added successfully to portal user"
}
```

**Error — All Permissions Already Exist (400)**:
```json
{
  "success": false,
  "message": "All specified permissions already exist for this role."
}
```

---

### 3.5 Remove Permissions from Role

* **Path**: `PUT /api/admin/role/permissions/remove/:roleId`
* **Access Control**: `Admin` only

**Request Body**:
```json
{
  "permissions": ["promote-user"]
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "result": {
    "_id": "60d5ec49f1b2c51f4c8b4568",
    "userPermissions": ["coin-distributor"],
    "...": "..."
  },
  "message": "Permissions removed successfully from portal user"
}
```

**Error — None of the Permissions Exist (400)**:
```json
{
  "success": false,
  "message": "None of the specified permissions exist for this role."
}
```

---

### 3.6 Block / Unblock Portal User (Activity Zone)

* **Path**: `PUT /api/admin/role/activity-zone`
* **Access Control**: `Admin` only

**Request Body**:
```json
{
  "targetId": "60d5ec49f1b2c51f4c8b4568",
  "zone": "temp_block",
  "date_till": "2026-06-01T00:00:00.000Z"
}
```

**Valid `zone` values**:
| Value | Description |
| :--- | :--- |
| `safe` | Unblocked / Normal |
| `temp_block` | Temporary block (requires `date_till`) |
| `permanent_block` | Permanent block |

**Response (200 OK)**:
```json
{
  "success": true,
  "result": {
    "_id": "60d5ec49f1b2c51f4c8b4568",
    "activityZone": {
      "zone": "temp_block",
      "createdAt": "2026-05-20T12:00:00.000Z",
      "expire": "2026-06-01T00:00:00.000Z"
    }
  }
}
```

---

## 4. Coin Distribution

### 4.1 Assign Coins to User (Admin/SubAdmin/Reseller)

* **Path**: `PUT /api/portal-user/users/assign-coin`
* **Access Control**: `Admin`, `SubAdmin` (with `coin-distributor` permission), or `Reseller`

**Allowed Sender → Receiver Rules**:
| Sender | Can Assign To | Additional Requirement |
| :--- | :--- | :--- |
| `Admin` | `SubAdmin`, `Reseller`, `User` | — |
| `SubAdmin` | `User` only | Must have `coin-distributor` permission |
| `Reseller` | `User` only | — |

**Request Body**:
```json
{
  "userId": "60d5ec49f1b2c51f4c8b4569",
  "coins": 1000,
  "userRole": "user"
}
```

**Validation Rules**:
- `coins` must be a positive whole number (integer)
- `coins` must be greater than 0
- `userRole` must be a valid `UserRoles` enum value
- `Host` is automatically normalized to `User` by the backend
- Self-transfer is blocked (sender cannot send coins to themselves)
- Atomic balance guard prevents negative balances from concurrent requests
- All operations run inside a MongoDB transaction
- If the receiver is a regular user, their level/tag/bg are recalculated based on new `totalBoughtCoins`

**Response (200 OK)**:
```json
{
  "success": true,
  "result": {
    "userId": "60d5ec49f1b2c51f4c8b4569",
    "coins": 15000,
    "...": "..."
  },
  "message": "Coins assigned to user successfully"
}
```

**Errors**:
| Status | Message | Cause |
| :--- | :--- | :--- |
| 400 | `Insufficient coins` | Sender doesn't have enough coins |
| 400 | `Self-transfer is not allowed` | Sender trying to send coins to themselves |
| 400 | `sub-admin cannot assign coins to merchant` | Invalid sender→receiver hierarchy |
| 400 | `User role mismatch` | The target user's actual role in DB doesn't match the claimed `userRole` |
| 401 | `You do not have the coin-distributor permission` | SubAdmin lacks required permission |

---

### 4.2 Assign Coins to Self (Admin)

* **Path**: `PUT /api/admin/auth/assign-coin`
* **Access Control**: `Admin` only

(See section 1.6 above for details.)

---

## 5. User Management

### 5.1 Update User Activity Zone

* **Path**: `PUT /api/admin/users/activity-zone`
* **Access Control**: `Admin` only

**Request Body**:
```json
{
  "id": "60d5ec49f1b2c51f4c8b4569",
  "zone": "temp_block",
  "date_till": "2026-06-01T00:00:00.000Z"
}
```

Same `zone` values as section 3.6. Affects regular app users.

---

### 5.2 Update User Stats (Diamonds / Stars)

* **Path**: `POST /api/admin/users/stats/update/:userId`
* **Access Control**: `Admin` only

**Request Body**:
```json
{
  "diamonds": 500,
  "stars": 100
}
```

At least one of `diamonds` or `stars` is required.

**Response (200 OK)**:
```json
{
  "success": true,
  "result": {
    "userId": "60d5ec49f1b2c51f4c8b4569",
    "diamonds": 1500,
    "stars": 300,
    "coins": 50000,
    "...": "..."
  }
}
```

---

### 5.3 Get All Moderators

* **Path**: `GET /api/admin/users/moderators`
* **Access Control**: `Admin` only

**Query Parameters**: Pagination (`page`, `limit`), search filters.

**Response (200 OK)**:
```json
{
  "success": true,
  "result": {
    "pagination": {
      "total": 25,
      "limit": 10,
      "page": 1,
      "totalPage": 3
    },
    "users": [
      { "...user object..." }
    ]
  },
  "message": "Moderators retrieved successfully"
}
```

---

### 5.4 Search Users by Email

* **Path**: `GET /api/portal-user/users/search?email=john@example.com`
* **Access Control**: Any authenticated user

**Response (200 OK)**:
```json
{
  "success": true,
  "result": [ { "...user object..." } ],
  "meta": { "...pagination..." },
  "message": "Users retrieved successfully"
}
```

---

### 5.5 Search User by Short ID (Exact)

* **Path**: `GET /api/portal-user/users/exact-search`
* **Access Control**: Any authenticated user

**Request Body**:
```json
{
  "shortId": 100245
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "result": { "...user object..." },
  "message": "Users retrieved successfully"
}
```

---

### 5.6 Retrieve All Users

* **Path**: `GET /api/portal-user/users`
* **Access Control**: Any authenticated user

**Query Parameters**: Pagination, search, filters.

---

### 5.7 Get Banned Users

* **Path**: `GET /api/admin/users/banned-users`
* **Access Control**: `Admin` only

**Response (200 OK)**:
```json
{
  "success": true,
  "result": {
    "pagination": { "...pagination..." },
    "users": [ "...banned user objects..." ]
  },
  "message": "Banned users retrieved successfully"
}
```

---

## 6. Promote / Demote User (Agency)

### 6.1 Promote User to Host

* **Path**: `PUT /api/portal-user/users/promote`
* **Access Control**: `Agency` only (must have `promote-user` permission)

**Request Body**:
```json
{
  "userId": "60d5ec49f1b2c51f4c8b4569",
  "permissions": ["live-room-close"]
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "result": {
    "_id": "60d5ec49f1b2c51f4c8b4569",
    "userRole": "host",
    "parentCreator": "60d5ec49f1b2c51f4c8b4570",
    "userPermissions": ["live-room-close"],
    "...": "..."
  },
  "message": "User promoted to moderator successfully"
}
```

**Error — Already a Host (400)**:
```json
{
  "success": false,
  "message": "John Doe already a host"
}
```

---

### 6.2 Demote Host to User

* **Path**: `PUT /api/portal-user/users/demote`
* **Access Control**: `Agency` only (must have `promote-user` permission)

**Request Body**:
```json
{
  "userId": "60d5ec49f1b2c51f4c8b4569"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "result": {
    "_id": "60d5ec49f1b2c51f4c8b4569",
    "userRole": "user",
    "userPermissions": [],
    "parentCreator": null,
    "...": "..."
  },
  "message": "User demoted to regular user successfully"
}
```

---

## 7. Portal User Listing

### 7.1 Get Upper Management (SubAdmin, Merchant, CountryAdmin)

* **Path**: `GET /api/portal-user/portal/:userRole`
* **Access Control**: Any authenticated user

**Valid Roles**: `sub-admin`, `merchant`, `country-admin`

**Response (200 OK)**:
```json
{
  "success": true,
  "result": {
    "pagination": { "...pagination..." },
    "data": [ "...portal user objects..." ]
  },
  "message": "Portal users retrieved successfully"
}
```

---

### 7.2 Get Mid Management by Parent (Reseller, Agency, countrySubAdmin)

* **Path**: `GET /api/portal-user/portal/mid/:userRole/:parentId`
* **Access Control**: Any authenticated user

**Valid Roles**: `re-seller`, `agency`, `country-sub-admin`

**Response (200 OK)**:
```json
{
  "success": true,
  "result": {
    "pagination": { "...pagination..." },
    "data": [ "...portal user objects..." ]
  },
  "message": "Portal users retrieved successfully"
}
```

---

### 7.3 Get Hosts by Parent Agency

* **Path**: `GET /api/portal-user/portal/lower/:parentId`
* **Access Control**: Any authenticated user

**Response (200 OK)**:
```json
{
  "success": true,
  "result": {
    "pagination": { "...pagination..." },
    "users": [ "...host user objects..." ]
  },
  "message": "Hosts retrieved successfully"
}
```

---

## 8. Gift Management

### 8.1 Create Gift

* **Path**: `POST /api/admin/gift`
* **Access Control**: `Admin` only
* **Content-Type**: `multipart/form-data`

**Form Fields**:
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `giftName` | `string` | Yes | Gift display name |
| `category` | `string` | Yes | Gift category |
| `coinPrice` | `number` | Yes | Price in coins (must be > 0) |
| `diamonds` | `number` | Yes | Diamond value (must be > 0) |
| `previewImage` | `file` | Yes | Preview image (PNG or SVG/SVGA) |
| `svgaImage` | `file` | Yes | SVGA animation file |

**Response (201 Created)**:
```json
{
  "success": true,
  "result": {
    "_id": "60d5ec49f1b2c51f4c8b4571",
    "name": "Rose",
    "category": "Romance",
    "coinPrice": 100,
    "diamonds": 10,
    "previewImage": "https://res.cloudinary.com/...",
    "svgaImage": "https://res.cloudinary.com/...",
    "createdAt": "2026-05-20T10:00:00.000Z",
    "updatedAt": "2026-05-20T10:00:00.000Z"
  },
  "message": "Gift created successfully"
}
```

---

### 8.2 Get Gifts

* **Path**: `GET /api/admin/gift`
* **Access Control**: Any authenticated user

**Response (200 OK)**:
```json
{
  "success": true,
  "result": [ "...gift objects..." ],
  "message": "Gifts retrieved successfully"
}
```

---

### 8.3 Update Gift

* **Path**: `PUT /api/admin/gift/:id`
* **Access Control**: `Admin` only
* **Content-Type**: `multipart/form-data`

**Form Fields**: Same as create, but all fields are optional.

---

### 8.4 Delete Gift

* **Path**: `DELETE /api/admin/gift/:id`
* **Access Control**: `Admin` only

---

### 8.5 Get Gift Categories

* **Path**: `GET /api/admin/gift-category`
* **Access Control**: `Admin` or `Agency`

**Response (200 OK)**:
```json
{
  "success": true,
  "result": ["Romance", "Party", "Luxury"],
  "message": "Gift categories retrieved successfully"
}
```

---

## 9. Withdraw Bonus Management

### 9.1 Get Withdraw Requests

* **Path**: `GET /api/admin/withdraw-requests`
* **Access Control**: `Admin` only

---

### 9.2 Update Withdraw Bonus Status

* **Path**: `PUT /api/admin/withdraw-requests/:bonusId`
* **Access Control**: `Admin` only

**Request Body**:
```json
{
  "status": "accepted"
}
```

**Valid Statuses**: `accepted`, `rejected`, `pending`

---

## 10. Agency Withdraw Management

### 10.1 Agency Submit Withdraw Request

* **Path**: `POST /api/portal-user/agency/withdraw`
* **Access Control**: `Agency` only

**Request Body**:
```json
{
  "accountType": "bkash",
  "accountNumber": "01712345678",
  "totalSalary": 50000
}
```

**Valid `accountType` values**: `bkash`, `nagad`, `bank`, `internal`

**Response (200 OK)**:
```json
{
  "success": true,
  "result": {
    "_id": "60d5ec49f1b2c51f4c8b4572",
    "accountType": "bkash",
    "accoutNumber": "01712345678",
    "agencyId": "60d5ec49f1b2c51f4c8b4570",
    "status": "pending",
    "totalSalary": 50000,
    "name": "John Agency",
    "withdrawDate": "2026-05-20T12:00:00.000Z"
  },
  "message": "Withdrawal request submitted successfully"
}
```

**Note**: Deducts diamonds from the agency's account atomically within a MongoDB transaction.

---

### 10.2 Get Agency Withdraw List (Admin)

* **Path**: `GET /api/portal-user/agency/withdraw`
* **Access Control**: `Admin` only

---

### 10.3 Get Agency Withdraw List (Admin Dashboard)

* **Path**: `GET /api/admin/agency-withdraw`
* **Access Control**: `Admin` only

---

### 10.4 Update Agency Withdraw Status

* **Path**: `PUT /api/admin/agency-withdraw/:withdrawId`
* **Access Control**: `Admin` only

**Request Body**:
```json
{
  "status": "accepted"
}
```

---

## 11. Agency Management

### 11.1 Get All Agency List

* **Path**: `GET /api/portal-user/agency-all`
* **Access Control**: Any authenticated user

---

### 11.2 Delete Agency

* **Path**: `DELETE /api/portal-user/portal-user/agency/:agencyId`
* **Access Control**: `Admin` or `SubAdmin`

**Pre-checks**: The agency must have **zero hosts** assigned to it, otherwise deletion is rejected.

**Error — Agency Has Hosts (409)**:
```json
{
  "success": false,
  "message": "John Agency has 5 hosts, so cannot be deleted until host count is 0"
}
```

---

### 11.3 Get All Join Requests (Agency)

* **Path**: `GET /api/portal-user/agency-join-request`
* **Access Control**: `Agency` only

---

### 11.4 Update Join Request Status

* **Path**: `PUT /api/portal-user/agency-join-request/:reqId`
* **Access Control**: `Agency` only

**Request Body**:
```json
{
  "status": "accepted"
}
```

**Behavior**:
- `accepted`: The requesting user's `userRole` is set to `host` and `parentCreator` is set to the agency's ID
- `rejected`: The join request is deleted from the database

---

## 12. Salary Management

### 12.1 Create Salary

* **Path**: `POST /api/admin/salaries`
* **Access Control**: `Admin` only

**Request Body**:
```json
{
  "diamondCount": 1000,
  "moneyCount": 50000,
  "country": "Bangladesh",
  "type": "monthly"
}
```

---

### 12.2 Get All Salaries

* **Path**: `GET /api/admin/salaries`
* **Access Control**: Any authenticated user

---

### 12.3 Get Salary Details

* **Path**: `GET /api/admin/salaries/:salaryId`
* **Access Control**: Public (no auth required)

---

### 12.4 Update Salary

* **Path**: `PUT /api/admin/salaries/:salaryId`
* **Access Control**: `Admin` only

---

### 12.5 Delete Salary

* **Path**: `DELETE /api/admin/salaries/:salaryId`
* **Access Control**: `Admin` only

---

### 12.6 Auto-Distribute Agency Commission

Manually triggers salary distribution to agencies (normally runs on the 1st and 16th of each month).

* **Path**: `PUT /api/admin/agency-commission-distribute`
* **Access Control**: `Admin` only

**Response (200 OK)**:
```json
{
  "success": true,
  "result": {
    "total": 10,
    "paid": 8,
    "successRate": 80
  }
}
```

---

## 13. Banner Management

### 13.1 Create Banner

* **Path**: `POST /api/admin/banners`
* **Access Control**: `Admin` only
* **Content-Type**: `multipart/form-data`

**Form Fields**:
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `image` | `file` | Yes | Banner image |
| `alt` | `string` | No | Alt text (defaults to `"banner"`) |

---

### 13.2 Get Banners (URLs only)

* **Path**: `GET /api/admin/banners`
* **Access Control**: Any authenticated user

**Response (200 OK)**:
```json
{
  "success": true,
  "result": [
    "https://res.cloudinary.com/...",
    "https://res.cloudinary.com/..."
  ],
  "message": "Banners retrieved successfully"
}
```

---

### 13.3 Get Banner Documents

* **Path**: `GET /api/admin/banners/docs`
* **Access Control**: Any authenticated user

**Response (200 OK)**:
```json
{
  "success": true,
  "result": [
    {
      "_id": "...",
      "url": "https://...",
      "alt": "banner",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "message": "Banners retrieved successfully"
}
```

---

### 13.4 Update Banner

* **Path**: `PUT /api/admin/banners/:id`
* **Access Control**: `Admin` only
* **Content-Type**: `multipart/form-data`

---

### 13.5 Delete Banner

* **Path**: `DELETE /api/admin/banners/:id`
* **Access Control**: `Admin` only

---

## 14. Poster Management

### 14.1 Create Poster

* **Path**: `POST /api/admin/posters`
* **Access Control**: `Admin` only
* **Content-Type**: `multipart/form-data`

**Form Fields**:
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `image` | `file` | Yes | Poster image |
| `alt` | `string` | Yes | Alt text |

---

### 14.2 Get Posters (URLs only)

* **Path**: `GET /api/admin/posters`
* **Access Control**: Any authenticated user

---

### 14.3 Get Poster Documents

* **Path**: `GET /api/admin/posters/docs`
* **Access Control**: Any authenticated user

---

### 14.4 Get Random Poster

* **Path**: `GET /api/admin/poster`
* **Access Control**: Any authenticated user

---

### 14.5 Update Poster

* **Path**: `PUT /api/admin/posters/:id`
* **Access Control**: `Admin` only
* **Content-Type**: `multipart/form-data`

---

### 14.6 Delete Poster

* **Path**: `DELETE /api/admin/posters/:id`
* **Access Control**: `Admin` only

---

## 15. Level Tags (Level Badges & Backgrounds)

### 15.1 Create Level Tag & Background

* **Path**: `POST /api/admin/level-tags`
* **Access Control**: `Admin` only
* **Content-Type**: `multipart/form-data`

**Form Fields**:
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `level` | `string` | Yes | Level range, format: `"1-10"` (must match `^\d+-\d+$`) |
| `tag` | `file` | Yes | Level tag badge image |
| `bg` | `file` | Yes | Level background image |

---

### 15.2 Get All Level Tags

* **Path**: `GET /api/admin/level-tags`
* **Access Control**: Public (no auth required)

---

### 15.3 Update Level Tag & Background

* **Path**: `PUT /api/admin/level-tags/:id`
* **Access Control**: `Admin` only
* **Content-Type**: `multipart/form-data`

All fields optional. Replaces images on Cloudinary if new ones provided.

---

## 16. Transaction History (Coin Distribution)

### 16.1 Get Admin Coin Distribution History

* **Path**: `GET /api/admin/transaction-admin`
* **Access Control**: `Admin` only

Returns all coin distribution transactions initiated by the admin.

---

### 16.2 Get Portal User Coin Distribution History

* **Path**: `GET /api/admin/transaction-portal-user/:userId`
* **Access Control**: `Admin`, `Merchant`, or `Reseller`

Returns coin distribution transactions for a specific portal user (Merchant/Reseller sees only their own history).

---

## 17. Update Cost Configuration

### 17.1 Create Update Cost Document

* **Path**: `POST /api/admin/update-cost`
* **Access Control**: `Admin` only

**Request Body**:
```json
{
  "nameUpdateCost": 500,
  "expEquivalentCoin": 100
}
```

---

### 17.2 Get Update Cost Document

* **Path**: `GET /api/admin/update-cost`
* **Access Control**: Any authenticated user

---

### 17.3 Update Update Cost Document

* **Path**: `PUT /api/admin/update-cost/:id`
* **Access Control**: `Admin` only

---

### 17.4 Delete Update Cost Document

* **Path**: `DELETE /api/admin/update-cost/:id`
* **Access Control**: `Admin` only

---

## 18. Dashboard & Reporting

### 18.1 Get Dashboard Stats

* **Path**: `GET /api/admin/dashboard/stats`
* **Access Control**: `Admin` only

**Response (200 OK)**:
```json
{
  "success": true,
  "result": {
    "users": 15000,
    "subAdmins": 5,
    "merchants": 20,
    "countryAdmins": 3
  },
  "message": "Dashboard stats retrieved successfully"
}
```

---

### 18.2 Assign Role to User

* **Path**: `PUT /api/admin/user/asign-role/:role`
* **Access Control**: `Admin` only

**Request Body**:
```json
{
  "userId": "60d5ec49f1b2c51f4c8b4569"
}
```

---

### 18.3 Get Users by Role

* **Path**: `GET /api/admin/user/asign-role/:role`
* **Access Control**: Any authenticated user

---

## 19. Deprecated Endpoints

| Path | Status | Replacement |
| :--- | :--- | :--- |
| `PUT /api/admin/users/moderator-permissions` | Returns 502 with "This API is no longer supported" | Use role permissions endpoints instead |
| `PUT /api/admin/users/remove-permissions` | Returns 502 with "This API is no longer supported" | Use role permissions endpoints instead |

---

## 20. Key Error Responses

### 400 Bad Request (Validation)
```json
{
  "success": false,
  "message": "Coins must be a whole number"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "You are not authorized to perform this action"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "UserId -> merchant_001 already exists"
}
```
