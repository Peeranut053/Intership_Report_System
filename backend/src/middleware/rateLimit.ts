import type { RequestHandler } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Minimal in-memory fixed-window rate limiter (no extra dependency needed).
 *
 * Note: this state lives in process memory, so it resets on restart and is
 * NOT shared across multiple server instances. If this app is ever deployed
 * behind a load balancer with more than one instance, replace this with a
 * shared-store limiter (e.g. backed by Redis).
 */
export function rateLimit(options: { windowMs: number; max: number; message?: string }): RequestHandler {
  const { windowMs, max, message } = options;
  const buckets = new Map<string, Bucket>();

  return (req, res, next) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= max) {
      res.status(429).json({
        success: false,
        message: message ?? "Too many requests. Please try again later.",
      });
      return;
    }

    bucket.count += 1;
    next();
  };
}
