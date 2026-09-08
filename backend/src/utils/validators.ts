export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

// Matches chk_students_code in database/internshipdb.sql
export const STUDENT_CODE_REGEX = /^[0-9]{12}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export function isValidStudentCode(code: string): boolean {
  return STUDENT_CODE_REGEX.test(code);
}

/**
 * Maps common Postgres constraint-violation error codes to a client-safe
 * { status, message } pair. Returns null if the error isn't one of these
 * known codes, so the caller can fall back to a generic 500.
 */
export function mapPgConstraintError(error: unknown): { status: number; message: string } | null {
  const code = (error as { code?: string } | null)?.code;

  switch (code) {
    case "23505": // unique_violation
      return { status: 409, message: "Duplicate value — email, username or student code already in use" };
    case "23503": // foreign_key_violation
      return { status: 400, message: "Referenced record does not exist (check majorId)" };
    case "23514": // check_violation
      return { status: 400, message: "Invalid data (failed a database constraint)" };
    default:
      return null;
  }
}
