import pool from "../config/database.js";
import type { Role } from "../types/auth.js";

// AuthUser.name (login/register/me responses) is meant to be the person's
// real name, not their login username — students, teachers, and mentors
// each have their real name stored on their own table (students.first_name
// + last_name, teachers.teacher_name, mentors.mentor_name), keyed by
// user_id. This resolves that, with the username as a last-resort fallback
// (should only matter if a users row somehow has no matching role row).
export async function resolveDisplayName(role: Role, userId: number, fallback: string): Promise<string> {
  if (role === "student") {
    const result = await pool.query<{ first_name: string; last_name: string }>(
      "SELECT first_name, last_name FROM students WHERE user_id = $1",
      [userId]
    );
    const row = result.rows[0];
    return row ? `${row.first_name} ${row.last_name}` : fallback;
  }

  if (role === "teacher") {
    const result = await pool.query<{ teacher_name: string }>(
      "SELECT teacher_name FROM teachers WHERE user_id = $1",
      [userId]
    );
    return result.rows[0]?.teacher_name ?? fallback;
  }

  if (role === "mentor") {
    const result = await pool.query<{ mentor_name: string }>(
      "SELECT mentor_name FROM mentors WHERE user_id = $1",
      [userId]
    );
    return result.rows[0]?.mentor_name ?? fallback;
  }

  return fallback;
}
