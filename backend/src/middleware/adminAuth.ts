import type { RequestHandler } from "express";
import { timingSafeEqual } from "node:crypto";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // Buffers of different length would throw in timingSafeEqual; bail out
  // early (this length check itself leaks no useful info to an attacker).
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Gate for admin-only endpoints (e.g. creating teacher/mentor accounts).
 * There is no `admin` role/user in the system yet, so this checks a shared
 * secret sent in the `x-admin-key` header instead of a JWT. Whoever holds
 * ADMIN_API_KEY (kept only in the server's .env, never in the frontend)
 * counts as the system administrator for this endpoint.
 */
export const requireAdminKey: RequestHandler = (req, res, next) => {
  const configuredKey = process.env["ADMIN_API_KEY"];

  if (!configuredKey) {
    res.status(503).json({
      success: false,
      message: "Admin API is not configured. Set ADMIN_API_KEY in the server's .env to enable it.",
    });
    return;
  }

  const providedKey = req.headers["x-admin-key"];

  if (typeof providedKey !== "string" || !safeCompare(providedKey, configuredKey)) {
    res.status(401).json({ success: false, message: "Invalid or missing admin key" });
    return;
  }

  next();
};
