import pool from "../config/database.js";

/**
 * Resolves the mentors.mentor_id row for a logged-in user (JWT carries
 * users.user_id, but student_mentors/report_checks/attendances/evaluation_*
 * all hang off mentor_id instead). Returns null if this user has no mentor
 * row (shouldn't happen for an account with role "mentor", since
 * adminCreateUser() always creates both together — but a defensive check is
 * cheap).
 */
export async function getMentorIdForUser(userId: number): Promise<number | null> {
  const result = await pool.query<{ mentor_id: number }>(
    "SELECT mentor_id FROM mentors WHERE user_id = $1",
    [userId]
  );
  return result.rows[0]?.mentor_id ?? null;
}
