import pool from "../config/database.js";

/**
 * Resolves the students.student_id row for a logged-in user (JWT carries
 * users.user_id, but almost every other table hangs off student_id instead).
 * Returns null if this user has no student row (shouldn't happen for an
 * account with role "student", since register()/adminCreateUser() always
 * create both together — but a defensive check is cheap).
 */
export async function getStudentIdForUser(userId: number): Promise<number | null> {
  const result = await pool.query<{ student_id: number }>(
    "SELECT student_id FROM students WHERE user_id = $1",
    [userId]
  );
  return result.rows[0]?.student_id ?? null;
}
