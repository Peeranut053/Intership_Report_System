import type { RequestHandler } from "express";
import type { AuthRequest, Role } from "../types/auth.js";

export function roleMiddleware(...allowedRoles: Role[]): RequestHandler {
  return (req, res, next) => {
    const user = (req as AuthRequest).user;

    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(" or ")}`,
      });
      return;
    }

    next();
  };
}
