import pool from "../config/database.js";

/**
 * Resolves the teachers.teacher_id row for a logged-in user (JWT carries
 * users.user_id, but student_teachers/evaluation_teachers/supervision_teachers
 * all hang off teacher_id instead). Returns null if this user has no teacher
 * row (shouldn't happen for an account with role "teacher", since
 * adminCreateUser() always creates both together — but a defensive check is
 * cheap).
 */
export async function getTeacherIdForUser(userId: number): Promise<number | null> {
  const result = await pool.query<{ teacher_id: number }>(
    "SELECT teacher_id FROM teachers WHERE user_id = $1",
    [userId]
  );
  return result.rows[0]?.teacher_id ?? null;
}
