import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import pool from "../config/database.js";
import {
  isValidEmail,
  isValidPassword,
  isValidStudentCode,
  mapPgConstraintError,
  MIN_PASSWORD_LENGTH,
} from "../utils/validators.js";
import { validateStudentRelations, insertStudentRelations } from "../utils/studentRelations.js";
import type { StudentRelationsInput } from "../utils/studentRelations.js";
import type { Role, User } from "../types/auth.js";

const VALID_ROLES: Role[] = ["student", "teacher", "mentor"];

// POST /api/admin/users  (requires x-admin-key header — see middleware/adminAuth.ts)
// Unlike /api/auth/register, this lets the caller pick any role, including
// teacher/mentor. Whichever role is chosen, the matching domain row
// (students/teachers/mentors) is created in the same transaction as the
// login account — a `users` row with no matching domain row can't be
// linked to internship reports, evaluations, etc.
export async function adminCreateUser(req: Request, res: Response): Promise<void> {
  const {
    name,
    firstName,
    lastName,
    email,
    password,
    role,
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
    firstName?: string;
    lastName?: string;
    email: string;
    password: string;
    role: Role;
    studentCode?: string;
    majorId?: number;
    internshipPlace?: string;
    internshipStart?: string;
    internshipEnd?: string;
    mentorId?: number;
    advisorTeacherId?: number;
    supervisorTeacherIds?: number[];
  };

  if (!name || !email || !password || !role) {
    res.status(400).json({ success: false, message: "name, email, password and role are required" });
    return;
  }

  if (!VALID_ROLES.includes(role)) {
    res.status(400).json({ success: false, message: `Role must be one of: ${VALID_ROLES.join(", ")}` });
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

  let relations: StudentRelationsInput | undefined;

  if (role === "student") {
    if (!firstName || !lastName || !studentCode || !majorId || !internshipPlace || !internshipStart || !internshipEnd) {
      res.status(400).json({
        success: false,
        message:
          "firstName, lastName, studentCode, majorId, internshipPlace, internshipStart and internshipEnd are required when role is student",
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
    relations = relationsResult.value;
  }

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

    if (role === "student" && relations) {
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
    } else if (role === "teacher") {
      await client.query(`INSERT INTO teachers (user_id, teacher_name) VALUES ($1, $2)`, [
        user.user_id,
        name,
      ]);
    } else if (role === "mentor") {
      await client.query(`INSERT INTO mentors (user_id, mentor_name) VALUES ($1, $2)`, [
        user.user_id,
        name,
      ]);
    }

    await client.query("COMMIT");

    // No token is issued here — this endpoint creates an account on behalf
    // of someone else; they log in themselves afterwards with their own
    // credentials via /api/auth/login.
    res.status(201).json({
      success: true,
      message: `${role} account created successfully`,
      user: {
        id: user.user_id,
        name: user.username,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    const mapped = mapPgConstraintError(error);
    if (mapped) {
      res.status(mapped.status).json({ success: false, message: mapped.message });
      return;
    }

    console.error("Admin create user error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    client.release();
  }
}
