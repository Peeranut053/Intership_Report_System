import { Router } from "express";
import { adminCreateUser } from "../controllers/adminController.js";
import { requireAdminKey } from "../middleware/adminAuth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();

// Rate-limit BEFORE the key check, so brute-forcing ADMIN_API_KEY itself is
// also throttled, not just failed logins.
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: "Too many admin requests. Please try again later.",
});

router.post("/users", adminRateLimit, requireAdminKey, adminCreateUser);

export default router;
