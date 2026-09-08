import { Router } from "express";
import { register, login, forgotPassword, resetPassword } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { resolveDisplayName } from "../utils/displayName.js";

const router = Router();

// Slow down brute-force login attempts and register spam. Separate limiters
// (separate buckets) so testing/using one endpoint doesn't eat into the
// other's quota.
const registerRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: "Too many registration attempts. Please try again in a few minutes.",
});

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: "Too many login attempts. Please try again in a few minutes.",
});

// Tighter limit — this one sends an email per request, so it's also a way
// to spam someone's inbox if left uncapped.
const forgotPasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "คำขอมากเกินไป กรุณาลองใหม่ภายหลัง",
});

const resetPasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "คำขอมากเกินไป กรุณาลองใหม่ภายหลัง",
});

// Public routes
router.post("/register", registerRateLimit, register);
router.post("/login", loginRateLimit, login);
router.post("/forgot-password", forgotPasswordRateLimit, forgotPassword);
router.post("/reset-password", resetPasswordRateLimit, resetPassword);

// Protected: get current user profile. The JWT payload only carries
// id/email/role, so this resolves the real display name (teacher_name,
// mentor_name, or first+last name) the same way login() does — otherwise
// AuthUser.name would come back empty on every page reload (useAuth calls
// this on mount) even though it was populated right after login.
router.get("/me", authMiddleware, async (req, res) => {
  const authUser = (req as import("../types/auth.js").AuthRequest).user;
  if (!authUser) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    const name = await resolveDisplayName(authUser.role, authUser.id, authUser.email);
    res.json({
      success: true,
      user: { id: authUser.id, name, email: authUser.email, role: authUser.role },
    });
  } catch (error) {
    console.error("Fetch me error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
