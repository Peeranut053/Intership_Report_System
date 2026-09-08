import type { RequestHandler } from "express";
import { verifyToken } from "../utils/jwt.js";
import type { AuthRequest } from "../types/auth.js";

// Cast เป็น RequestHandler เพื่อให้ Express router ยอมรับ
export const authMiddleware: RequestHandler = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ success: false, message: "No token provided" });
    return;
  }

  try {
    const payload = verifyToken(token);
    (req as AuthRequest).user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
