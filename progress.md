# Project Progress

**Date:** 2026-05-24
**Time:** 15:31

---

## APIs Created

### `GET /admin/user-roles` — `getAllUserRoles`

- **Description:** Returns all existing enum values for user roles.
- **Auth:** Admin only (`authenticate([UserRoles.Admin])`)
- **Controller:** `src/controllers/admin/admin_user_controller.ts` — `getAllUserRoles`
- **Route:** `src/router/admin_routes.ts`
- **Response:**
  ```json
  {
    "statusCode": 200,
    "success": true,
    "result": ["user", "admin", "merchant", "re-seller", "sub-admin", "agency", "host", "country-admin", "country-sub-admin"],
    "message": "User roles retrieved successfully"
  }
  ```
- **Enum source:** `src/core/Utils/enums.ts` — `UserRoles`

---

### `POST /admin/create-role` — `createPortalUser` (Modified)

**Date:** 2026-05-24
**Time:** 16:16

- **Description:** Updated to give Admin full authority over portal user creation.
- **Changes made:**
  1. **`src/core/Utils/helper_functions.ts`** — `validateCreatePortalUserData` now explicitly allows only: `Merchant`, `Reseller`, `SubAdmin`, `Agency`, `CountryAdmin`, `countrySubAdmin`. Blocks `Admin`, `User`, `Host`, and any invalid roles.
  2. **`src/services/admin/admin_user_service.ts`** — `createPortalUser`: Removed both `parentCreator` validation blocks (Agency→SubAdmin check, countrySubAdmin→CountryAdmin check). Sets `parentCreator` to `null` since admin is the sole authority.
  3. **`src/router/admin_routes.ts`** — Route restricted from `[Admin, SubAdmin]` to `[Admin]` only.
- **Auth:** Admin only (`authenticate([UserRoles.Admin])`)
- **Creatable roles:** `merchant`, `re-seller`, `sub-admin`, `agency`, `country-admin`, `country-sub-admin`

---

### `GET /admin/portal-users` — `getAllPortalUsers`

**Date:** 2026-05-24
**Time:** 16:29

- **Description:** Returns all portal users with optional role filter, pagination, and search. Password field excluded from response.
- **Auth:** Admin only (`authenticate([UserRoles.Admin])`)
- **Query params:**
  - `role` (optional) — filter by role, e.g., `?role=sub-admin`
  - `page`, `limit` — pagination
  - `searchTerm` — search by name or userId
- **Files changed:**
  1. **`src/repository/portal_user/portal_user_repository.ts`** — Added `getAllPortalUsers(query)` with optional role filter, `.selectField("-password")`, pagination, and search.
  2. **`src/services/admin/admin_user_service.ts`** — Added `getAllPortalUsers(query)` to interface and implementation.
  3. **`src/controllers/admin/admin_user_controller.ts`** — Added `getAllPortalUsers` handler.
  4. **`src/router/admin_routes.ts`** — Added route at `GET /admin/portal-users`.
- **Response:** Paginated list of portal user documents (password excluded).

---

### `DELETE /admin/role/:roleId` — `deletePortalUser`

**Date:** 2026-05-24
**Time:** 16:38

- **Description:** Deletes a portal user by ID. Already existed under the `/role/:roleId` path. Added route alias `DELETE /admin/portal-users/:roleId` for cleaner semantics.
- **Auth:** Admin only (`authenticate([UserRoles.Admin])`)
- **Files:**
  1. **`src/services/admin/admin_user_service.ts`** — `deletePortalUser(id)` (pre-existing)
  2. **`src/controllers/admin/admin_user_controller.ts`** — `deleteRole` handler (pre-existing)
  3. **`src/router/admin_routes.ts`** — Added `DELETE /admin/portal-users/:roleId` alias (new)
- **Response:** Deleted portal user document.

---

### `PUT /admin/portal-users/:roleId` — `updatePortalUser`

**Date:** 2026-05-24
**Time:** 16:38

- **Description:** Updates a portal user by ID. Admin can update any field (name, password, coins, diamonds, designation, etc.). Password is automatically hashed if provided.
- **Auth:** Admin only (`authenticate([UserRoles.Admin])`)
- **Files changed:**
  1. **`src/services/admin/admin_user_service.ts`** — Added `updatePortalUser(id, data)` to interface + implementation. Validates user exists, hashes password if included, delegates to repository.
  2. **`src/controllers/admin/admin_user_controller.ts`** — Added `updatePortalUser` handler with validation for non-empty body.
  3. **`src/router/admin_routes.ts`** — Added `PUT /admin/portal-users/:roleId` with admin auth.
