import crypto from "crypto";

/**
 * HMAC-SHA256 request signing for the Adda ⇄ Games provider contract.
 *
 * Both backends must derive the identical canonical string or nothing verifies.
 * The games backend holds no money: it asks Adda to move coins. An HMAC over the
 * method, path, timestamp, nonce and body binds the credential to one exact
 * request, so a captured call can neither be replayed nor re-aimed.
 *
 * Canonical string (LF-joined, no trailing newline):
 *
 *     v1
 *     POST
 *     /api/game/internal/wallet/debit      ← path + query, byte-for-byte as sent
 *     1783507781                           ← unix SECONDS
 *     3f9a…                                ← nonce (32 hex chars)
 *     e3b0c442…                            ← hex sha256 of the RAW body
 *
 * Signature = hex(hmac_sha256(secret, canonical)), sent as `X-Signature: v1=<hex>`.
 * The shared secret is INTERNAL_SERVICE_SECRET here / PROVIDER_SECRET on games.
 */

export const SIGNATURE_VERSION = "v1";

export const SIGNATURE_HEADERS = {
  operatorId: "x-operator-id",
  timestamp: "x-timestamp",
  nonce: "x-nonce",
  signature: "x-signature",
} as const;

/** sha256("") — the body hash every GET carries. */
export const EMPTY_BODY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

export type SignatureFailure =
  | "MISSING_HEADERS"
  | "BAD_VERSION"
  | "STALE_TIMESTAMP"
  | "REPLAYED_NONCE"
  | "BAD_SIGNATURE";

export interface SignatureParts {
  method: string;
  /**
   * Request target: path AND query string exactly as transmitted, e.g.
   * `/api/game/internal/wallet/debit`. Covering the query stops a captured
   * request being re-aimed at a different window or resource. Never re-encode
   * or reorder — sign the bytes that go on the wire.
   */
  path: string;
  /** Unix seconds. Accepts the raw header string so verification stays byte-exact. */
  timestamp: number | string;
  nonce: string;
  /** Raw body bytes exactly as transmitted. Empty for GET. */
  body: string | Buffer;
}

export function sha256Hex(body: string | Buffer): string {
  return crypto.createHash("sha256").update(body ?? "").digest("hex");
}

export function canonicalString(p: SignatureParts): string {
  return [
    SIGNATURE_VERSION,
    p.method.toUpperCase(),
    p.path,
    String(p.timestamp),
    p.nonce,
    sha256Hex(p.body ?? ""),
  ].join("\n");
}

export function sign(secret: string, p: SignatureParts): string {
  return crypto.createHmac("sha256", secret).update(canonicalString(p)).digest("hex");
}

/** Ready-to-send `X-Signature` header value. */
export function signatureHeader(secret: string, p: SignatureParts): string {
  return `${SIGNATURE_VERSION}=${sign(secret, p)}`;
}

export function newNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

/** Constant-time compare — a `===` here leaks the signature byte by byte. */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/** Max tolerated |now − X-Timestamp|. Must be >= the games backend's setting. */
export function clockSkewSeconds(): number {
  const raw = Number(process.env.INTERNAL_CLOCK_SKEW_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? raw : 300;
}

/**
 * Nonce cache — rejects a nonce reused inside the freshness window, closing the
 * replay hole the timestamp window alone leaves open.
 *
 * Per-process: behind multiple instances a nonce could be replayed once per
 * instance within the window. Money operations are independently protected by
 * idempotency keys, so the practical exposure is nil.
 */
export class NonceCache {
  private readonly seen = new Map<string, number>();

  constructor(private readonly ttlSeconds: number) {}

  /** True if fresh (and records it); false if already used. */
  check(nonce: string, nowMs: number = Date.now()): boolean {
    this.evict(nowMs);
    if (this.seen.has(nonce)) return false;
    this.seen.set(nonce, nowMs + this.ttlSeconds * 1000);
    return true;
  }

  private evict(nowMs: number): void {
    if (this.seen.size >= 10_000) {
      // Pathological growth — drop everything rather than leak. Worst case a
      // handful of nonces become replayable inside the skew window.
      this.seen.clear();
      return;
    }
    for (const [nonce, expiresAt] of this.seen) {
      if (expiresAt <= nowMs) this.seen.delete(nonce);
    }
  }
}

export interface VerifyOptions {
  secret: string;
  method: string;
  path: string;
  body: string | Buffer;
  headers: Record<string, string | string[] | undefined>;
  clockSkewSeconds: number;
  nonceCache?: NonceCache;
  nowMs?: number;
}

export interface VerifyResult {
  ok: boolean;
  reason?: SignatureFailure;
}

/** Case-insensitive header read — Node lowercases inbound names, but don't rely on it. */
function header(
  headers: VerifyOptions["headers"],
  name: string,
): string | undefined {
  const want = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() !== want) continue;
    const value = headers[key];
    return Array.isArray(value) ? value[0] : value;
  }
  return undefined;
}

/** Verify an inbound signed request. Never throws — returns a reason instead. */
export function verifySignature(opts: VerifyOptions): VerifyResult {
  const ts = header(opts.headers, SIGNATURE_HEADERS.timestamp);
  const nonce = header(opts.headers, SIGNATURE_HEADERS.nonce);
  const provided = header(opts.headers, SIGNATURE_HEADERS.signature);
  if (!ts || !nonce || !provided) return { ok: false, reason: "MISSING_HEADERS" };

  const [version, hex] = provided.split("=", 2);
  if (version !== SIGNATURE_VERSION || !hex) return { ok: false, reason: "BAD_VERSION" };

  const timestamp = Number(ts);
  const nowSec = Math.floor((opts.nowMs ?? Date.now()) / 1000);
  if (
    !Number.isFinite(timestamp) ||
    Math.abs(nowSec - timestamp) > opts.clockSkewSeconds
  ) {
    return { ok: false, reason: "STALE_TIMESTAMP" };
  }

  // Sign with the RAW timestamp string, not the parsed number — the canonical
  // string must reproduce the bytes the caller hashed.
  const expected = sign(opts.secret, {
    method: opts.method,
    path: opts.path,
    timestamp: ts,
    nonce,
    body: opts.body,
  });

  // Signature check BEFORE burning the nonce: otherwise an attacker could poison
  // the cache with guessed nonces and lock out legitimate requests.
  if (!safeEqual(expected, hex)) return { ok: false, reason: "BAD_SIGNATURE" };

  if (opts.nonceCache && !opts.nonceCache.check(nonce, opts.nowMs)) {
    return { ok: false, reason: "REPLAYED_NONCE" };
  }

  return { ok: true };
}
