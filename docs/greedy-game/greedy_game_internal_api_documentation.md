# Games Integration — Adda ⇄ adda-games-backend

The games backend (`adda-games-backend`) runs the games but **holds no money**. Adda stays the single source of truth for every coin. Games bets, pays out and refunds by calling the signed `/internal/*` API documented here, and players authenticate to games with a short-lived token Adda mints.

Two directions:

| Direction | Auth | What flows |
|---|---|---|
| Games → Adda | HMAC-SHA256 (`X-Signature`) | wallet debit / credit / balance / lookup, user names & search |
| Adda → Games | HMAC-SHA256 (same secret) | daily reconciliation pull |
| Player → Games | JWT signed with the shared player secret | placing bets, reading rounds |

---

## Connecting the two backends

### 1. Set these on **Adda** (`.env`)

```bash
# Shared HMAC secret. MUST equal PROVIDER_SECRET on the games backend.
# Without it, every /internal/* route returns 403 INTERNAL_AUTH_DISABLED.
INTERNAL_SERVICE_SECRET=<long random string>

# Signs the player tokens the games backend verifies.
# MUST equal JWT_ACCESS_SECRET on the games backend.
# Keep it DIFFERENT from JWT_SECRET — sharing that one would hand the games
# backend the key to every Adda session, admin sessions included.
GAME_JWT_ACCESS_SECRET=<long random string, different from the above>

GAME_SESSION_TOKEN_TTL_SECONDS=900     # match games' GAME_SESSION_TOKEN_TTL (15m)
INTERNAL_CLOCK_SKEW_SECONDS=300        # must be >= games' PROVIDER_CLOCK_SKEW_SECONDS
INTERNAL_REQUIRE_SIGNATURE=true        # leave true; see "Cutover" below

# Outbound (reconciliation). MUST include the games /api/v1 prefix.
GAMES_BASE_URL=http://localhost:5002/api/v1
# GAMES_OPERATOR_ID=zimolive           # optional: pin the caller
# GAMES_PUBLIC_URL=http://localhost:5002  # handed to the app in the token response
```

### 2. Set these on **adda-games-backend** (`.env`)

```bash
PROVIDER_SECRET=<same value as Adda's INTERNAL_SERVICE_SECRET>
JWT_ACCESS_SECRET=<same value as Adda's GAME_JWT_ACCESS_SECRET>

# Adda's API base. Either prefix works — Adda serves /internal/* under both.
PROVIDER_BASE_URL=http://localhost:8000/api/game
# PROVIDER_BASE_URL=http://localhost:8000/api/v1     # also valid
```

The signature covers the **full path as transmitted**, so whichever prefix you point `PROVIDER_BASE_URL` at is the one that gets signed and verified. Adda mounts the internal router at both `/api/game/internal` and `/api/v1/internal` so either value works with no code change.

### 3. Player flow

```
client logs into Adda
   └─> POST /api/game/session/token   (Authorization: Bearer <Adda login token>)
       └─> { token, expiresIn, gamesBaseUrl }
           └─> client calls the games backend with  Authorization: Bearer <token>
               └─> games verifies it locally with the shared secret — no callback
```

Adda's normal login token **cannot** be used here: it carries `{ id, role, permissions }`, has no `sub` and no expiry, and is signed with `JWT_SECRET`. The games backend requires `sub` + a live `exp` and verifies with `JWT_ACCESS_SECRET`. `/api/game/session/token` bridges that gap.

When the game token nears expiry the client calls the games backend's own `POST /games/session/extend` (sliding session, capped at 8h from the original login via the `sst` claim), or simply re-mints from Adda.

---

## Authentication (HMAC request signing)

Every `/internal/*` endpoint requires a valid HMAC-SHA256 signature. This gives:

- **Integrity** — the body wasn't tampered with
- **Freshness** — the request isn't a replay (5-minute window + single-use nonce)
- **Authenticity** — the caller knows the shared secret

### Required headers

| Header | Description |
|--------|-------------|
| `X-Timestamp` | Unix timestamp in **seconds** |
| `X-Nonce` | Random hex string, single-use |
| `X-Signature` | `v1=<hmac_hex>` |
| `X-Operator-Id` | Optional; verified only if `GAMES_OPERATOR_ID` is set |

### Canonical string

Six lines joined with `\n` (no trailing newline), then HMAC-SHA256'd with the shared secret:

```
v1
POST
/api/game/internal/wallet/debit
1783507781
d82762b7d8030a704ca7a4c62ac66548
3df9e0911e6d6e5de...
```

| Line | Description |
|------|-------------|
| `v1` | Version (always `v1`) |
| `POST` | HTTP method, uppercase |
| `/api/game/internal/wallet/debit` | Full path **including query string**, byte-for-byte as transmitted |
| `1783507781` | Unix seconds |
| `d82762b7...` | Nonce |
| `3df9e091...` | SHA-256 hex of the **raw** request body |

**Empty body hash** (every GET):
```
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

> **The #1 mistake:** hashing your *parsed* body instead of the raw bytes. Re-serialising JSON changes spacing and key order and every signature will fail. Adda captures the raw bytes via `express.json({ verify })` in `src/server.ts`.

Reference implementation: [`src/core/Utils/games_signature.ts`](../../src/core/Utils/games_signature.ts). Verified byte-for-byte against the games backend's `src/provider/provider-signature.ts`.

### Signature failures — all `403`

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SIGNATURE_INVALID",
    "details": { "reason": "BAD_SIGNATURE" }
  }
}
```

| Code / reason | Meaning |
|--------|---------|
| `INTERNAL_AUTH_DISABLED` | `INTERNAL_SERVICE_SECRET` is not set on Adda |
| `INTERNAL_SIGNATURE_REQUIRED` | No signature sent while strict mode is on |
| `MISSING_HEADERS` | `X-Timestamp`, `X-Nonce` or `X-Signature` missing |
| `BAD_VERSION` | Signature doesn't start with `v1=` |
| `STALE_TIMESTAMP` | Timestamp outside the skew window |
| `BAD_SIGNATURE` | HMAC mismatch |
| `REPLAYED_NONCE` | Nonce already used inside the window |
| `UNKNOWN_OPERATOR` | `X-Operator-Id` doesn't match `GAMES_OPERATOR_ID` |

### Cutover

`INTERNAL_REQUIRE_SIGNATURE=true` (the default) requires a signature. Set it to `false` only if you need to temporarily accept the legacy static `x-internal-secret` header that games also sends while `PROVIDER_LEGACY_HEADER=true`. Turn strict mode on **before** games sets `PROVIDER_LEGACY_HEADER=false`.

---

## The status-code contract — read this before changing any handler

The **HTTP status is what tells the games backend whether money moved.** It never parses the error string to decide.

| Adda returns | Games concludes | What games does |
|---|---|---|
| `2xx` | the coins **moved** | places the bet |
| `4xx` | the coins **definitely did not move** | fails the bet, tells the player, never asks again |
| `5xx` / timeout | outcome is **UNKNOWN** | reconciles later via `GET /internal/wallet/transaction/:key` |

Two rules follow:

1. **Never return `4xx` after coins have been taken.** The stake would be silently lost.
2. **An unclassified error must be a `5xx`.** `/internal/*` therefore has its own error handler ([`internal_error_handler.ts`](../../src/greedy_game/middlewares/internal_error_handler.ts)) rather than the app-wide one, which turns a Mongo duplicate-key into a `400`.

---

## Endpoints

Base: `/api/game/internal` (or `/api/v1/internal` — identical).

### 1. Get wallet balance

```
GET /internal/wallet/:userId/balance
```

**200:**
```json
{ "coins": 12450, "diamonds": 3, "frozen": false }
```

`frozen` is always `false` — Adda has no wallet-freeze flag yet. When one exists, set it in `GreedyGameService.getUserBalance` and games will block bets on its own.

| Status | Meaning |
|---|---|
| 400 | `INVALID_USER_ID` |
| 404 | `USER_NOT_FOUND` — no such player |
| 403 | signature failed |

A player who exists but has no `userstats` row reads as `0 / 0`, not an error.

---

### 2. Debit wallet

```
POST /internal/wallet/debit
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | `string` | Yes | Mongo ObjectId |
| `currency` | `string` | Yes | `coins` \| `diamonds` |
| `amount` | `number` | Yes | Positive integer |
| `type` | `string` | Yes | `game_bet` \| `game_payout` \| `refund` |
| `idempotencyKey` | `string` | Yes | Unique; see below |
| `description` | `string` | No | |
| `refType` | `string` | No | |
| `refId` | `string` | No | |

```json
{
  "userId": "6a4e2b1710656f690e3de4ca",
  "currency": "coins",
  "amount": 50,
  "type": "game_bet",
  "idempotencyKey": "game-bet:6a410b454d95a8de140207eb",
  "description": "Bet on B7 — spin_wheel round 5",
  "refType": "game_bet",
  "refId": "round_123"
}
```

**200** — including on an idempotent replay, which returns the **original** transaction id:
```json
{ "txn": { "id": "6a410b45440bca0cf39b57ac" } }
```

| Status | Code |
|---|---|
| 400 | `INSUFFICIENT_BALANCE` — definitively nothing moved |
| 400 | `INVALID_USER_ID` / `INVALID_CURRENCY` / `INVALID_AMOUNT` / `INVALID_TYPE` |
| 403 | signature failed |
| 500 | `INTERNAL_ERROR` — outcome unknown, reconcile |

**Flow:** look up the idempotency key → Mongo transaction → atomic conditional deduct on the requested currency → insert the ledger row → commit.

Two safety nets you should not remove:

- **The unique index on `idempotencyKey`.** The `findOne` pre-check loses a concurrent race; the index is what actually stops a double charge. A loser gets `11000`, its balance change rolls back with the transaction, and the winner's row is returned as a normal idempotent `200`.
- **Transient-abort retry.** MongoDB aborts a transaction that races another for the same document and expects the client to retry. This is routine — two bets by the same player in one round both touch that player's single `userstats` row. Without the retry they collide and Adda reports a `5xx` for a bet that plainly never applied.

---

### 3. Credit wallet

```
POST /internal/wallet/credit
```

Same body and responses as debit. No balance guard. The `userstats` row is **upserted**, so a payout is never lost because a player somehow has no stats document.

---

### 4. Look up a transaction by idempotency key

```
GET /internal/wallet/transaction/:idempotencyKey
```

This is how games settles *"my debit timed out — did the coins actually move?"*

**Found (200):**
```json
{
  "applied": true,
  "txn": {
    "id": "6a410b45440bca0cf39b57ac",
    "userId": "6a4e2b1710656f690e3de4ca",
    "amount": 50,
    "currency": "coins",
    "type": "game_bet",
    "direction": "debit",
    "balanceAfter": 12400,
    "createdAt": "2026-07-08T12:30:00.000Z"
  }
}
```

**Not found — also `200`:**
```json
{ "applied": false, "txn": null }
```

> **It must be `200`, not `404`.** This is a *question*, and `applied: false` is a valid, definitive answer. A `404` reads on the games side as a hard `4xx` failure and strands its bet-recovery — the one caller that can refund a player whose debit timed out.
>
> For the same reason this read goes to the **primary**, never a secondary: `applied: false` must mean *definitely not applied*, never *not visible yet*.

---

### 5. Batch transaction lookup

```
POST /internal/wallet/transactions/lookup
```

Powers the games admin history's "balance after each round". Best-effort on the games side — the column degrades to "—" if Adda is unreachable.

```json
{ "txnIds": ["6a410b45440bca0cf39b57ac"] }
```

**200:**
```json
{
  "txns": [
    {
      "id": "6a410b45440bca0cf39b57ac",
      "userId": "6a4e2b1710656f690e3de4ca",
      "amount": 50,
      "currency": "coins",
      "type": "game_bet",
      "direction": "debit",
      "balanceAfter": 12400,
      "createdAt": "2026-07-08T12:30:00.000Z"
    }
  ]
}
```

Max 500 ids per call. Rows written before `direction`/`balanceAfter` existed return a derived `direction` and `balanceAfter: null`.

---

### 6. Get user names

```
POST /internal/users/names
```

```json
{ "userIds": ["6a4e2b1710656f690e3de4ca"] }
```

**200:**
```json
{
  "users": [
    {
      "userId": "6a4e2b1710656f690e3de4ca",
      "displayName": "Zaman",
      "username": "zaman",
      "avatarUrl": "https://example.com/avatar.png",
      "numericId": 100238
    }
  ]
}
```

Malformed ids are dropped rather than failing the batch — one bad id must not blank out a leaderboard. `400 INVALID_REQUEST` only if `userIds` isn't a non-empty array.

---

### 7. Search users

```
POST /internal/users/search
```

Free-text player lookup for the games admin panel. Matches display name or username substring, the numeric `userId`, or a pasted ObjectId. Capped at 20 results.

```json
{ "query": "zaman" }
```

**200:** same `{ "users": [...] }` shape as above.

---

## Player session token (Adda → client)

```
POST /api/game/session/token
Authorization: Bearer <Adda login token>
```

**200:**
```json
{
  "success": true,
  "message": "Game session token issued",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900,
    "gamesBaseUrl": "http://localhost:5002"
  }
}
```

The token is HS256, signed with `GAME_JWT_ACCESS_SECRET`, and carries:

| Claim | Meaning |
|---|---|
| `sub` | the player's Mongo `_id` — the same id games sends back on every `/internal/wallet/*` call |
| `username` | display convenience |
| `sst` | session start time; games carries it across extensions to cap a session at 8h |
| `exp` | expiry — games rejects expired tokens |

| Status | Meaning |
|---|---|
| 401 | not authenticated with Adda |
| 404 | `USER_NOT_FOUND` |
| 503 | `GAMES_NOT_CONFIGURED` — `GAME_JWT_ACCESS_SECRET` isn't set |

---

## Reconciliation (Adda → games)

```
GET /api/admin/game/reconciliation?from=<ISO>&to=<ISO>&gameKey=&cursor=&limit=
Authorization: Bearer <admin token>          # admin / sub-admin only
```

Proxies the games backend's own signed reconciliation endpoint. Games records every bet it asked Adda to settle, so diffing that against `greedy_game_wallet_transactions` catches any debit that moved coins but never made it into a round — or a round that ran without one. Worth running daily.

Window is capped at 31 days by the games backend. Requires `GAMES_BASE_URL` and `INTERNAL_SERVICE_SECRET`.

---

## Idempotency keys

All derived from the games backend's 24-hex `betId`:

| Key | Operation |
|---|---|
| `game-bet:<betId>` | debit — the stake |
| `game-payout:<betId>` | credit — the win |
| `game-refund:<betId>` | credit — the stake returned |

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `INTERNAL_SERVICE_SECRET` | Yes | Shared HMAC secret. Equals games' `PROVIDER_SECRET`. |
| `GAME_JWT_ACCESS_SECRET` | Yes | Signs player tokens. Equals games' `JWT_ACCESS_SECRET`. Must differ from `JWT_SECRET`. |
| `GAME_SESSION_TOKEN_TTL_SECONDS` | No | Default `900`. |
| `INTERNAL_CLOCK_SKEW_SECONDS` | No | Default `300`. Must be ≥ games' `PROVIDER_CLOCK_SKEW_SECONDS`. |
| `INTERNAL_REQUIRE_SIGNATURE` | No | Default `true`. |
| `GAMES_OPERATOR_ID` | No | Pins `X-Operator-Id`. Unset = accept any. |
| `GAMES_BASE_URL` | For reconciliation | Games API base, **including** `/api/v1`. |
| `GAMES_TIMEOUT_MS` | No | Default `10000`. |
| `GAMES_PUBLIC_URL` | No | Returned to the client in the token response. |

---

## Database collections

| Collection | Description |
|------------|-------------|
| `greedy_game_wallet_transactions` | Every game debit/credit. Unique index on `idempotencyKey`. |
| `userstats` | Player coin/diamond balances. |
| `users` | Player profiles. |
