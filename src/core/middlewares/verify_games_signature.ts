import { Request, Response, NextFunction } from "express";
import {
  NonceCache,
  SIGNATURE_HEADERS,
  clockSkewSeconds,
  safeEqual,
  verifySignature,
} from "../Utils/games_signature";

const nonceCache = new NonceCache(clockSkewSeconds());

/** Strict by default. Set INTERNAL_REQUIRE_SIGNATURE=false only to accept the
 *  legacy static `x-internal-secret` header during a cutover. */
function requireSignature(): boolean {
  return process.env.INTERNAL_REQUIRE_SIGNATURE !== "false";
}

function reject(res: Response, code: string, reason?: string): void {
  res.status(403).json({
    success: false,
    error: reason ? { code, details: { reason } } : { code },
  });
}

/**
 * Gate for every `/internal/*` route the games backend calls.
 *
 * Verifies the HMAC-SHA256 signature described in `core/Utils/games_signature.ts`
 * against the RAW request bytes captured by the `express.json({ verify })` hook
 * in server.ts. Re-serialising the parsed body would change spacing and key
 * order, and every signature would fail.
 *
 * The signature covers `req.originalUrl`, which is the full mounted path
 * (`/api/game/internal/...` or `/api/v1/internal/...`) plus the query string —
 * so the games backend must sign whatever `PROVIDER_BASE_URL` resolves to.
 */
export default function verifyGamesRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const secret = process.env.INTERNAL_SERVICE_SECRET;

  if (!secret) {
    reject(res, "INTERNAL_AUTH_DISABLED");
    return;
  }

  const signed = Boolean(req.get(SIGNATURE_HEADERS.signature));

  if (!signed) {
    if (requireSignature()) {
      reject(res, "INTERNAL_SIGNATURE_REQUIRED");
      return;
    }
    // Cutover path: the games backend still sends the static header alongside
    // its signature (PROVIDER_LEGACY_HEADER=true) so a host that has not yet
    // adopted signing keeps working. Turn strict mode on before games drops it.
    const legacy = req.get("x-internal-secret");
    if (legacy && safeEqual(legacy, secret)) {
      next();
      return;
    }
    reject(res, "INTERNAL_SIGNATURE_INVALID", "MISSING_HEADERS");
    return;
  }

  // Optional: pin the caller. Leave GAMES_OPERATOR_ID unset to accept any.
  const expectedOperator = process.env.GAMES_OPERATOR_ID;
  if (
    expectedOperator &&
    req.get(SIGNATURE_HEADERS.operatorId) !== expectedOperator
  ) {
    reject(res, "INTERNAL_SIGNATURE_INVALID", "UNKNOWN_OPERATOR");
    return;
  }

  const result = verifySignature({
    secret,
    method: req.method,
    path: req.originalUrl,
    body: (req as any).rawBody ?? Buffer.alloc(0),
    headers: req.headers,
    clockSkewSeconds: clockSkewSeconds(),
    nonceCache,
  });

  if (!result.ok) {
    reject(res, "INTERNAL_SIGNATURE_INVALID", result.reason);
    return;
  }

  next();
}
