import type { PoolClient } from "pg";

export interface StudentRelationsInput {
  mentorId: number;
  advisorTeacherId: number;
  supervisorTeacherIds: number[];
}

type ValidationResult = { error: string } | { value: StudentRelationsInput };

/**
 * Validates the "who supervises this student" fields collected at
 * registration: one mentor (student_mentors), one advisor teacher and
 * exactly two supervisor teachers (both rows in student_teachers,
 * distinguished by teacher_role — see database/internshipdb.sql).
 */
export function validateStudentRelations(input: {
  mentorId?: unknown;
  advisorTeacherId?: unknown;
  supervisorTeacherIds?: unknown;
}): ValidationResult {
  const { mentorId, advisorTeacherId, supervisorTeacherIds } = input;

  if (!mentorId || !advisorTeacherId || !supervisorTeacherIds) {
    return { error: "mentorId, advisorTeacherId and supervisorTeacherIds are required" };
  }

  if (!Array.isArray(supervisorTeacherIds) || supervisorTeacherIds.length !== 2) {
    return { error: "supervisorTeacherIds must be an array of exactly 2 teacher IDs" };
  }

  if (supervisorTeacherIds.some((id) => !Number.isFinite(Number(id)))) {
    return { error: "supervisorTeacherIds must contain valid teacher IDs" };
  }

  if (new Set(supervisorTeacherIds.map(Number)).size !== 2) {
    return { error: "supervisorTeacherIds must contain two different teacher IDs" };
  }

  return {
    value: {
      mentorId: Number(mentorId),
      advisorTeacherId: Number(advisorTeacherId),
      supervisorTeacherIds: supervisorTeacherIds.map(Number),
    },
  };
}

/**
 * Inserts the advisor/supervisor/mentor assignment rows for a newly created
 * student. Must run inside the same transaction as the students row insert
 * (invalid mentorId/teacherId values fail via foreign-key violation, which
 * the caller maps to a 400 with mapPgConstraintError).
 */
export async function insertStudentRelations(
  client: PoolClient,
  studentId: number,
  relations: StudentRelationsInput
): Promise<void> {
  await client.query(
    `INSERT INTO student_teachers (student_id, teacher_id, teacher_role) VALUES ($1, $2, 'advisor')`,
    [studentId, relations.advisorTeacherId]
  );

  for (const supervisorId of relations.supervisorTeacherIds) {
    await client.query(
      `INSERT INTO student_teachers (student_id, teacher_id, teacher_role) VALUES ($1, $2, 'supervisor')`,
      [studentId, supervisorId]
    );
  }

  await client.query(`INSERT INTO student_mentors (student_id, mentor_id) VALUES ($1, $2)`, [
    studentId,
    relations.mentorId,
  ]);
}

/**
 * Replaces an existing student's advisor/supervisor/mentor assignments —
 * used when a student edits their own profile after registration. Clears
 * the old student_teachers/student_mentors rows first, then re-inserts via
 * insertStudentRelations, all inside the caller's transaction.
 */
export async function replaceStudentRelations(
  client: PoolClient,
  studentId: number,
  relations: StudentRelationsInput
): Promise<void> {
  await client.query(`DELETE FROM student_teachers WHERE student_id = $1`, [studentId]);
  await client.query(`DELETE FROM student_mentors WHERE student_id = $1`, [studentId]);
  await insertStudentRelations(client, studentId, relations);
}
