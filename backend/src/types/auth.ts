export type Role = "student" | "teacher" | "mentor";

// Matches the actual `users` table in database/internshipdb.sql
// (user_id, username, password — not id/name/password_hash).
export interface User {
  user_id: number;
  username: string;
  email: string;
  password: string;
  role: Role;
  created_at: Date;
}

export interface JwtPayload {
  id: number;
  email: string;
  role: Role;
}

// Extend Express Request to carry authenticated user
import type { Request } from "express";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}
