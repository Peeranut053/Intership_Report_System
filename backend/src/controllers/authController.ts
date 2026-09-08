import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import pool from "../config/database.js";
import { signToken } from "../utils/jwt.js";
import { sendPasswordResetEmail } from "../utils/mailer.js";
import {
  isValidEmail,
  isValidPassword,
  isValidStudentCode,
  mapPgConstraintError,
  MIN_PASSWORD_LENGTH,
} from "../utils/validators.js";
import { validateStudentRelations, insertStudentRelations } from "../utils/studentRelations.js";
import { resolveDisplayName } from "../utils/displayName.js";
import type { Role, User } from "../types/auth.js";

const RESET_TOKEN_TTL_MINUTES = 30;

function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// POST /api/auth/register
// Public self-registration is always a student account — the role is
// deliberately NOT taken from the request body (prevents privilege
// escalation). Teacher/mentor accounts are created via POST /api/admin/users
// instead. Creating a student also requires the `students` table fields
// (schema requires them NOT NULL) plus the advisor/supervisor teachers and
// mentor the student picked, so everything is written in one transaction —
// a user with no matching student row (or no supervision assigned) would be
// unusable.
export async function register(req: Request, res: Response): Promise<void> {
  const {
    name,
    firstName,
    lastName,
    email,
    password,
    studentCode,
    majorId,
    internshipPlace,
    internshipStart,
    internshipEnd,
    mentorId,
    advisorTeacherId,
    supervisorTeacherIds,
  } = req.body as {
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    studentCode: string;
    majorId: number;
    internshipPlace: string;
    internshipStart: string;
    internshipEnd: string;
    mentorId: number;
    advisorTeacherId: number;
    supervisorTeacherIds: number[];
  };

  if (
    !name ||
    !firstName ||
    !lastName ||
    !email ||
    !password ||
    !studentCode ||
    !majorId ||
    !internshipPlace ||
    !internshipStart ||
    !internshipEnd
  ) {
    res.status(400).json({
      success: false,
      message:
        "name, firstName, lastName, email, password, studentCode, majorId, internshipPlace, internshipStart and internshipEnd are all required",
    });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({ success: false, message: "Invalid email format" });
    return;
  }

  if (!isValidPassword(password)) {
    res.status(400).json({
      success: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
    return;
  }

  if (!isValidStudentCode(studentCode)) {
    res.status(400).json({ success: false, message: "studentCode must be exactly 12 digits" });
    return;
  }

  if (new Date(internshipEnd) < new Date(internshipStart)) {
    res.status(400).json({ success: false, message: "internshipEnd must not be before internshipStart" });
    return;
  }

  const relationsResult = validateStudentRelations({ mentorId, advisorTeacherId, supervisorTeacherIds });
  if ("error" in relationsResult) {
    res.status(400).json({ success: false, message: relationsResult.error });
    return;
  }
  const relations = relationsResult.value;

  const role: Role = "student";
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT user_id FROM users WHERE email = $1 OR username = $2",
      [email, name]
    );
    if ((existing.rowCount ?? 0) > 0) {
      await client.query("ROLLBACK");
      res.status(409).json({ success: false, message: "Email or username already in use" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const userResult = await client.query<User>(
      `INSERT INTO users (username, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, username, email, role, created_at`,
      [name, email, passwordHash, role]
    );

    const user = userResult.rows[0];
    if (!user) {
      throw new Error("Failed to create user row");
    }

    const studentResult = await client.query<{ student_id: number }>(
      `INSERT INTO students
         (user_id, student_code, first_name, last_name, major_id, internship_place, internship_start, internship_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING student_id`,
      [user.user_id, studentCode, firstName, lastName, majorId, internshipPlace, internshipStart, internshipEnd]
    );

    const studentId = studentResult.rows[0]?.student_id;
    if (!studentId) {
      throw new Error("Failed to create student row");
    }

    await insertStudentRelations(client, studentId, relations);

    await client.query("COMMIT");

    const token = signToken({ id: user.user_id, email: user.email, role: user.role });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      // Registration is always a student — the real name is already known
      // from the request body, no extra lookup needed.
      user: { id: user.user_id, name: `${firstName} ${lastName}`, email: user.email, role: user.role },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    const mapped = mapPgConstraintError(error);
    if (mapped) {
      res.status(mapped.status).json({ success: false, message: mapped.message });
      return;
    }

    console.error("Register error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    client.release();
  }
}

// POST /api/auth/login
// Accepts either the user's email or username in "identifier" (matches the
// login form, which just has one "username" field — see LoginPage.tsx).
export async function login(req: Request, res: Response): Promise<void> {
  const { identifier, password } = req.body as { identifier: string; password: string };

  if (!identifier || !password) {
    res.status(400).json({ success: false, message: "identifier and password are required" });
    return;
  }

  try {
    const result = await pool.query<User>(
      "SELECT * FROM users WHERE email = $1 OR username = $1",
      [identifier]
    );

    const user = result.rows[0];

    if (!user) {
      res.status(401).json({ success: false, message: "Invalid username/email or password" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: "Invalid username/email or password" });
      return;
    }

    const token = signToken({ id: user.user_id, email: user.email, role: user.role });
    const name = await resolveDisplayName(user.role, user.user_id, user.username);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: { id: user.user_id, name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// POST /api/auth/forgot-password
// Public, rate-limited (see authRoutes.ts). Always returns the same generic
// message whether or not the account exists — otherwise this endpoint could
// be used to check which emails/usernames are registered.
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { identifier } = req.body as { identifier?: string };

  if (!identifier) {
    res.status(400).json({ success: false, message: "identifier is required" });
    return;
  }

  const genericResponse = {
    success: true,
    message: "ถ้ามีบัญชีที่ตรงกับข้อมูลนี้ ระบบได้ส่งอีเมลลิงก์รีเซ็ตรหัสผ่านไปให้แล้ว",
  };

  try {
    const userResult = await pool.query<{ user_id: number; email: string }>(
      "SELECT user_id, email FROM users WHERE email = $1 OR username = $1",
      [identifier]
    );
    const user = userResult.rows[0];

    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashResetToken(rawToken);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

      await pool.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [user.user_id, tokenHash, expiresAt]
      );

      const frontendUrl = process.env["FRONTEND_URL"] ?? "http://localhost:5173";
      const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

      try {
        await sendPasswordResetEmail(user.email, resetUrl);
      } catch (mailError) {
        // Don't leak SMTP failures to the client — that alone would confirm
        // the account exists. Log it so the admin can see delivery/config
        // problems (e.g. SMTP_* not set yet). Logging the reset URL itself
        // here is a deliberate local-dev convenience (this only reaches the
        // server's own terminal, never the client) so the flow is testable
        // before real SMTP is configured — fine for dev, but worth removing
        // this resetUrl line once SMTP is wired up for real use.
        console.error("Failed to send password reset email:", mailError);
        console.log("[dev only] password reset link:", resetUrl);
      }
    }

    res.json(genericResponse);
  } catch (error) {
    console.error("Forgot password error:", error);
    // Still return the generic response on unexpected errors — a different
    // response here would also leak whether the account exists.
    res.json(genericResponse);
  }
}

// POST /api/auth/reset-password
export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, newPassword } = req.body as { token?: string; newPassword?: string };

  if (!token || !newPassword) {
    res.status(400).json({ success: false, message: "token and newPassword are required" });
    return;
  }

  if (!isValidPassword(newPassword)) {
    res.status(400).json({
      success: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tokenHash = hashResetToken(token);

    const tokenResult = await client.query<{ token_id: number; user_id: number }>(
      `SELECT token_id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [tokenHash]
    );

    const tokenRow = tokenResult.rows[0];
    if (!tokenRow) {
      await client.query("ROLLBACK");
      res.status(400).json({ success: false, message: "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว" });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await client.query("UPDATE users SET password = $1 WHERE user_id = $2", [
      passwordHash,
      tokenRow.user_id,
    ]);

    // Mark every outstanding token for this user used, not just the one that
    // was redeemed — an older still-unused reset link should stop working
    // too once the password has actually been changed.
    await client.query(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
      [tokenRow.user_id]
    );

    await client.query("COMMIT");

    res.json({ success: true, message: "ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Reset password error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    client.release();
  }
}
