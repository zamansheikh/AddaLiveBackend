import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

const seenNonces = new Map<string, number>();

export default function verifyGamesRequest(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.INTERNAL_SERVICE_SECRET;

  if (!secret) {
    res.status(403).json({
      success: false,
      error: { code: "INTERNAL_AUTH_DISABLED" },
    });
    return;
  }

  const ts = req.get("X-Timestamp");
  const nonce = req.get("X-Nonce");
  const given = req.get("X-Signature");

  if (!ts || !nonce || !given) {
    res.status(403).json({
      success: false,
      error: { code: "INTERNAL_SIGNATURE_INVALID", details: { reason: "MISSING_HEADERS" } },
    });
    return;
  }

  const [version, hex] = given.split("=", 2);
  if (version !== "v1" || !hex) {
    res.status(403).json({
      success: false,
      error: { code: "INTERNAL_SIGNATURE_INVALID", details: { reason: "BAD_VERSION" } },
    });
    return;
  }

  if (Math.abs(Math.floor(Date.now() / 1000) - Number(ts)) > 300) {
    res.status(403).json({
      success: false,
      error: { code: "INTERNAL_SIGNATURE_INVALID", details: { reason: "STALE_TIMESTAMP" } },
    });
    return;
  }

  const rawBody = (req as any).rawBody ?? Buffer.alloc(0);
  const bodyHash = crypto.createHash("sha256").update(rawBody).digest("hex");
  const canonical = ["v1", req.method.toUpperCase(), req.originalUrl, ts, nonce, bodyHash].join("\n");
  const expected = crypto.createHmac("sha256", secret).update(canonical).digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(hex, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(403).json({
      success: false,
      error: { code: "INTERNAL_SIGNATURE_INVALID", details: { reason: "BAD_SIGNATURE" } },
    });
    return;
  }

  const now = Date.now();
  for (const [n, exp] of seenNonces) if (exp <= now) seenNonces.delete(n);
  if (seenNonces.has(nonce)) {
    res.status(403).json({
      success: false,
      error: { code: "INTERNAL_SIGNATURE_INVALID", details: { reason: "REPLAYED_NONCE" } },
    });
    return;
  }
  seenNonces.set(nonce, now + 300_000);

  next();
}
