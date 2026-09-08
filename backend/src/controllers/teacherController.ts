import type { Request, Response } from "express";
import pool from "../config/database.js";
import { getTeacherIdForUser } from "../utils/teacherLookup.js";
import type { AuthRequest } from "../types/auth.js";

// The evaluation_categories row for the อาจารย์นิเทศ's สมุดบันทึก (daily
// report notebook) evaluation — 5 questions, distinct from the mentor's
// 20-question evaluation category, so evaluator_type='teacher' alone can't
// tell forms apart once more teacher-side evaluations exist.
const NOTEBOOK_EVALUATION_CATEGORY = "แบบประเมินผลสมุดบันทึกการฝึกประสบการณ์วิชาชีพ (สำหรับอาจารย์นิเทศ)";

// GET /api/teacher/students — the students assigned to the logged-in
// teacher (as อาจารย์ที่ปรึกษา and/or อาจารย์นิเทศ — a student can have both
// roles from the same teacher, so roles are aggregated per student), plus
// summary counts for the หน้าหลัก dashboard cards.
export async function listMyStudents(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthRequest).user!;

  try {
    const teacherId = await getTeacherIdForUser(authUser.id);
    if (!teacherId) {
      res.status(404).json({ success: false, message: "Teacher profile not found" });
      return;
    }

    const studentsResult = await pool.query(
      `SELECT s.student_id, s.student_code, s.first_name, s.last_name,
              maj.major_name, s.internship_place, s.internship_start, s.internship_end,
              STRING_AGG(DISTINCT st.teacher_role, ',' ORDER BY st.teacher_role) AS roles,
              EXISTS (
                SELECT 1 FROM submissions sub WHERE sub.student_id = s.student_id
              ) AS has_submission,
              EXISTS (
                SELECT 1 FROM daily_reports dr WHERE dr.student_id = s.student_id
              ) AS has_reports
       FROM student_teachers st
       JOIN students s ON s.student_id = st.student_id
       JOIN majors maj ON maj.major_id = s.major_id
       WHERE st.teacher_id = $1
       GROUP BY s.student_id, s.student_code, s.first_name, s.last_name,
                maj.major_name, s.internship_place, s.internship_start, s.internship_end
       ORDER BY s.student_code`,
      [teacherId]
    );

    const students = studentsResult.rows.map((row) => ({
      studentId: row.student_id as number,
      studentCode: row.student_code as string,
      studentName: `${row.first_name} ${row.last_name}`,
      majorName: row.major_name as string,
      internshipPlace: row.internship_place as string,
      internshipStart: row.internship_start as string,
      internshipEnd: row.internship_end as string,
      roles: (row.roles as string).split(",") as ("advisor" | "supervisor")[],
      hasSubmission: row.has_submission as boolean,
      hasReports: row.has_reports as boolean,
    }));

    const summary = {
      totalStudents: students.length,
      advisorCount: students.filter((s) => s.roles.includes("advisor")).length,
      supervisorCount: students.filter((s) => s.roles.includes("supervisor")).length,
    };

    res.json({ success: true, students, summary });
  } catch (error) {
    console.error("List teacher students error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/teacher/students/:studentId/supervisions — one student's
// supervision-visit history (บันทึกการนิเทศ), limited to the visits this
// teacher was recorded on (supervision_teachers), newest first.
export async function getStudentSupervisions(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthRequest).user!;
  const studentId = Number(req.params["studentId"]);

  if (!Number.isFinite(studentId)) {
    res.status(400).json({ success: false, message: "Invalid student id" });
    return;
  }

  try {
    const teacherId = await getTeacherIdForUser(authUser.id);
    if (!teacherId) {
      res.status(404).json({ success: false, message: "Teacher profile not found" });
      return;
    }

    const studentResult = await pool.query(
      `SELECT s.student_id, s.student_code, s.first_name, s.last_name, s.internship_place
       FROM student_teachers st
       JOIN students s ON s.student_id = st.student_id
       WHERE st.teacher_id = $1 AND st.student_id = $2 AND st.teacher_role = 'supervisor'`,
      [teacherId, studentId]
    );

    const student = studentResult.rows[0];
    if (!student) {
      // Either this student doesn't exist, isn't assigned to this teacher,
      // or this teacher is only the advisor (not the supervisor) — only the
      // assigned อาจารย์นิเทศ can view/keep a supervision log for a student.
      // Same response either way so this can't be used to probe other
      // teachers' students.
      res.status(404).json({ success: false, message: "Student not found" });
      return;
    }

    const supervisionsResult = await pool.query(
      `SELECT sv.supervision_id, sv.supervision_date,
              COALESCE(
                json_agg(
                  json_build_object('topicId', st.topic_id, 'topic', st.topic, 'detail', st.detail)
                  ORDER BY st.sort_order, st.topic_id
                ) FILTER (WHERE st.topic_id IS NOT NULL),
                '[]'
              ) AS topics
       FROM supervisions sv
       JOIN supervision_teachers svt ON svt.supervision_id = sv.supervision_id
       LEFT JOIN supervision_topics st ON st.supervision_id = sv.supervision_id
       WHERE sv.student_id = $1 AND svt.teacher_id = $2
       GROUP BY sv.supervision_id, sv.supervision_date
       ORDER BY sv.supervision_date DESC, sv.supervision_id DESC`,
      [studentId, teacherId]
    );

    res.json({
      success: true,
      student: {
        studentId: student.student_id,
        studentCode: student.student_code,
        studentName: `${student.first_name} ${student.last_name}`,
        internshipPlace: student.internship_place,
      },
      supervisions: supervisionsResult.rows,
    });
  } catch (error) {
    console.error("Get teacher supervisions error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

interface SupervisionTopicInput {
  topic?: string;
  detail?: string;
}

interface SupervisionBody {
  supervisionDate?: string;
  topics?: SupervisionTopicInput[];
}

// Validates that `topics` is a non-empty array where every entry has a
// non-blank topic string. Returns the trimmed list, or null if invalid.
function parseTopics(topics: unknown): { topic: string; detail: string | null }[] | null {
  if (!Array.isArray(topics) || topics.length === 0) return null;
  const parsed: { topic: string; detail: string | null }[] = [];
  for (const entry of topics as SupervisionTopicInput[]) {
    const topic = entry?.topic?.trim();
    if (!topic) return null;
    parsed.push({ topic, detail: entry.detail?.trim() ? entry.detail.trim() : null });
  }
  return parsed;
}

async function replaceSupervisionTopics(
  client: import("pg").PoolClient,
  supervisionId: number,
  topics: { topic: string; detail: string | null }[]
): Promise<void> {
  await client.query("DELETE FROM supervision_topics WHERE supervision_id = $1", [supervisionId]);
  for (let i = 0; i < topics.length; i++) {
    const t = topics[i]!;
    await client.query(
      `INSERT INTO supervision_topics (supervision_id, topic, detail, sort_order)
       VALUES ($1, $2, $3, $4)`,
      [supervisionId, t.topic, t.detail, i]
    );
  }
}

// POST /api/teacher/students/:studentId/supervisions — records a new
// supervision visit: one supervisions row (date) linked to this teacher via
// supervision_teachers, plus one supervision_topics row per topic covered.
export async function createSupervision(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthRequest).user!;
  const studentId = Number(req.params["studentId"]);
  const { supervisionDate, topics: rawTopics } = req.body as SupervisionBody;

  if (!Number.isFinite(studentId)) {
    res.status(400).json({ success: false, message: "Invalid student id" });
    return;
  }
  if (!supervisionDate || !DATE_REGEX.test(supervisionDate)) {
    res.status(400).json({ success: false, message: "supervisionDate (YYYY-MM-DD) is required" });
    return;
  }
  const topics = parseTopics(rawTopics);
  if (!topics) {
    res.status(400).json({ success: false, message: "At least one topic (with non-empty text) is required" });
    return;
  }

  const client = await pool.connect();
  try {
    const teacherId = await getTeacherIdForUser(authUser.id);
    if (!teacherId) {
      res.status(404).json({ success: false, message: "Teacher profile not found" });
      return;
    }

    // Only the student's assigned อาจารย์นิเทศ (teacher_role = 'supervisor')
    // may record a supervision visit — being the อาจารย์ที่ปรึกษา (advisor)
    // alone is not enough.
    const owned = await client.query(
      "SELECT 1 FROM student_teachers WHERE teacher_id = $1 AND student_id = $2 AND teacher_role = 'supervisor'",
      [teacherId, studentId]
    );
    if (owned.rowCount === 0) {
      res.status(404).json({ success: false, message: "Student not found" });
      return;
    }

    await client.query("BEGIN");

    const created = await client.query(
      `INSERT INTO supervisions (student_id, supervision_date)
       VALUES ($1, $2)
       RETURNING supervision_id, supervision_date`,
      [studentId, supervisionDate]
    );
    const supervisionId = created.rows[0].supervision_id as number;

    await client.query(
      "INSERT INTO supervision_teachers (supervision_id, teacher_id) VALUES ($1, $2)",
      [supervisionId, teacherId]
    );

    await replaceSupervisionTopics(client, supervisionId, topics);

    await client.query("COMMIT");
    res.status(201).json({
      success: true,
      supervision: {
        supervision_id: supervisionId,
        supervision_date: created.rows[0].supervision_date,
        topics: topics.map((t, i) => ({ topicId: null, topic: t.topic, detail: t.detail, sortOrder: i })),
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create supervision error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    client.release();
  }
}

// PUT /api/teacher/supervisions/:supervisionId — updates the visit date and
// replaces its full set of topics (simplest correct approach for a small,
// per-visit list edited as a whole from one form).
export async function updateSupervision(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthRequest).user!;
  const supervisionId = Number(req.params["supervisionId"]);
  const { supervisionDate, topics: rawTopics } = req.body as SupervisionBody;

  if (!Number.isFinite(supervisionId)) {
    res.status(400).json({ success: false, message: "Invalid supervision id" });
    return;
  }
  if (!supervisionDate || !DATE_REGEX.test(supervisionDate)) {
    res.status(400).json({ success: false, message: "supervisionDate (YYYY-MM-DD) is required" });
    return;
  }
  const topics = parseTopics(rawTopics);
  if (!topics) {
    res.status(400).json({ success: false, message: "At least one topic (with non-empty text) is required" });
    return;
  }

  const client = await pool.connect();
  try {
    const teacherId = await getTeacherIdForUser(authUser.id);
    if (!teacherId) {
      res.status(404).json({ success: false, message: "Teacher profile not found" });
      return;
    }

    const ownerCheck = await client.query(
      "SELECT 1 FROM supervision_teachers WHERE supervision_id = $1 AND teacher_id = $2",
      [supervisionId, teacherId]
    );
    if (ownerCheck.rowCount === 0) {
      // Either the id doesn't exist or this teacher wasn't recorded on it —
      // same response either way.
      res.status(404).json({ success: false, message: "Supervision record not found" });
      return;
    }

    await client.query("BEGIN");

    const updated = await client.query(
      `UPDATE supervisions SET supervision_date = $1 WHERE supervision_id = $2
       RETURNING supervision_id, supervision_date`,
      [supervisionDate, supervisionId]
    );

    await replaceSupervisionTopics(client, supervisionId, topics);

    await client.query("COMMIT");
    res.json({
      success: true,
      supervision: {
        supervision_id: updated.rows[0].supervision_id,
        supervision_date: updated.rows[0].supervision_date,
        topics: topics.map((t, i) => ({ topicId: null, topic: t.topic, detail: t.detail, sortOrder: i })),
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update supervision error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    client.release();
  }
}

// DELETE /api/teacher/supervisions/:supervisionId
export async function deleteSupervision(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthRequest).user!;
  const supervisionId = Number(req.params["supervisionId"]);

  if (!Number.isFinite(supervisionId)) {
    res.status(400).json({ success: false, message: "Invalid supervision id" });
    return;
  }

  try {
    const teacherId = await getTeacherIdForUser(authUser.id);
    if (!teacherId) {
      res.status(404).json({ success: false, message: "Teacher profile not found" });
      return;
    }

    const ownerCheck = await pool.query(
      "SELECT 1 FROM supervision_teachers WHERE supervision_id = $1 AND teacher_id = $2",
      [supervisionId, teacherId]
    );
    if (ownerCheck.rowCount === 0) {
      res.status(404).json({ success: false, message: "Supervision record not found" });
      return;
    }

    // supervision_teachers rows cascade-delete with their parent supervisions row.
    await pool.query("DELETE FROM supervisions WHERE supervision_id = $1", [supervisionId]);

    res.json({ success: true, message: "ลบบันทึกการนิเทศเรียบร้อยแล้ว" });
  } catch (error) {
    console.error("Delete supervision error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// GET /api/teacher/students/:studentId/notebook-evaluation — the
// 5-question แบบประเมินผลสมุดบันทึก (daily-report notebook evaluation),
// limited to the student's assigned อาจารย์นิเทศ. Mirrors the shape of the
// mentor's evaluation endpoint (student header + live attendance summary +
// questions + running total) minus the free-text detail fields, which this
// form doesn't have.
export async function getNotebookEvaluation(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthRequest).user!;
  const studentId = Number(req.params["studentId"]);

  if (!Number.isFinite(studentId)) {
    res.status(400).json({ success: false, message: "Invalid student id" });
    return;
  }

  try {
    const teacherId = await getTeacherIdForUser(authUser.id);
    if (!teacherId) {
      res.status(404).json({ success: false, message: "Teacher profile not found" });
      return;
    }

    const studentResult = await pool.query(
      `SELECT s.student_id, s.student_code, s.first_name, s.last_name, s.internship_place,
              s.internship_start, s.internship_end, s.semester, s.year_level, maj.major_name
       FROM student_teachers st
       JOIN students s ON s.student_id = st.student_id
       JOIN majors maj ON maj.major_id = s.major_id
       WHERE st.teacher_id = $1 AND st.student_id = $2 AND st.teacher_role = 'supervisor'`,
      [teacherId, studentId]
    );
    const student = studentResult.rows[0];
    if (!student) {
      // Either this student doesn't exist, isn't assigned to this teacher,
      // or this teacher is only the advisor — only the assigned อาจารย์นิเทศ
      // evaluates the notebook.
      res.status(404).json({ success: false, message: "Student not found" });
      return;
    }

    const attendanceResult = await pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM attendances
       WHERE student_id = $1
       GROUP BY status`,
      [studentId]
    );
    const attendanceCounts: Record<string, number> = {};
    for (const row of attendanceResult.rows) {
      attendanceCounts[row.status] = row.count;
    }

    const questionsResult = await pool.query(
      `SELECT eq.question_id, eq.question_no, eq.question
       FROM evaluation_questions eq
       JOIN evaluation_categories ec ON ec.category_id = eq.category_id
       WHERE ec.category_name = $1
       ORDER BY eq.question_no`,
      [NOTEBOOK_EVALUATION_CATEGORY]
    );

    const existingResult = await pool.query(
      `SELECT ef.evaluation_id
       FROM evaluation_forms ef
       JOIN evaluation_teachers et ON et.evaluation_id = ef.evaluation_id
       JOIN evaluation_categories ec ON ec.category_id = ef.category_id
       WHERE ef.student_id = $1 AND et.teacher_id = $2
         AND ef.evaluator_type = 'teacher' AND ec.category_name = $3
       LIMIT 1`,
      [studentId, teacherId, NOTEBOOK_EVALUATION_CATEGORY]
    );
    const evaluationId = existingResult.rows[0]?.evaluation_id as number | undefined;

    let scoresByQuestion: Record<number, number> = {};
    if (evaluationId) {
      const scoresResult = await pool.query(
        "SELECT question_id, score FROM evaluation_scores WHERE evaluation_id = $1",
        [evaluationId]
      );
      scoresByQuestion = Object.fromEntries(scoresResult.rows.map((r) => [r.question_id, r.score]));
    }

    const questions = questionsResult.rows.map((row) => ({
      questionId: row.question_id,
      questionNo: row.question_no,
      question: row.question,
      score: scoresByQuestion[row.question_id] ?? null,
    }));

    const totalScore = questions.reduce((sum, q) => sum + (q.score ?? 0), 0);

    res.json({
      success: true,
      student: {
        studentId: student.student_id,
        studentCode: student.student_code,
        studentName: `${student.first_name} ${student.last_name}`,
        majorName: student.major_name,
        internshipPlace: student.internship_place,
        internshipStart: student.internship_start,
        internshipEnd: student.internship_end,
        semester: student.semester,
        yearLevel: student.year_level,
      },
      attendanceSummary: {
        sickCount: attendanceCounts["sick"] ?? 0,
        leaveCount: attendanceCounts["leave"] ?? 0,
        absentCount: attendanceCounts["absent"] ?? 0,
        presentCount: attendanceCounts["present"] ?? 0,
      },
      questions,
      maxScore: questions.length * 4,
      totalScore,
    });
  } catch (error) {
    console.error("Get notebook evaluation error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// PUT /api/teacher/students/:studentId/notebook-evaluation — find-or-creates
// this teacher's notebook evaluation_forms row (scoped to the notebook
// category, so it never collides with a future teacher-side evaluation of a
// different kind), then upserts the 5 scores.
export async function saveNotebookEvaluation(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthRequest).user!;
  const studentId = Number(req.params["studentId"]);
  const { scores } = req.body as { scores?: Record<string, number> };

  if (!Number.isFinite(studentId)) {
    res.status(400).json({ success: false, message: "Invalid student id" });
    return;
  }

  const scoreEntries = Object.entries(scores ?? {});
  for (const [, score] of scoreEntries) {
    if (!Number.isInteger(score) || score < 1 || score > 4) {
      res.status(400).json({ success: false, message: "Each score must be an integer from 1 to 4" });
      return;
    }
  }

  const client = await pool.connect();
  try {
    const teacherId = await getTeacherIdForUser(authUser.id);
    if (!teacherId) {
      res.status(404).json({ success: false, message: "Teacher profile not found" });
      return;
    }

    const owned = await client.query(
      "SELECT 1 FROM student_teachers WHERE teacher_id = $1 AND student_id = $2 AND teacher_role = 'supervisor'",
      [teacherId, studentId]
    );
    if (owned.rowCount === 0) {
      res.status(404).json({ success: false, message: "Student not found" });
      return;
    }

    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT ef.evaluation_id
       FROM evaluation_forms ef
       JOIN evaluation_teachers et ON et.evaluation_id = ef.evaluation_id
       JOIN evaluation_categories ec ON ec.category_id = ef.category_id
       WHERE ef.student_id = $1 AND et.teacher_id = $2
         AND ef.evaluator_type = 'teacher' AND ec.category_name = $3
       LIMIT 1`,
      [studentId, teacherId, NOTEBOOK_EVALUATION_CATEGORY]
    );

    let evaluationId = existing.rows[0]?.evaluation_id as number | undefined;
    if (!evaluationId) {
      const created = await client.query(
        `INSERT INTO evaluation_forms (student_id, evaluator_type, category_id)
         VALUES ($1, 'teacher', (SELECT category_id FROM evaluation_categories WHERE category_name = $2))
         RETURNING evaluation_id`,
        [studentId, NOTEBOOK_EVALUATION_CATEGORY]
      );
      evaluationId = created.rows[0].evaluation_id;
      await client.query("INSERT INTO evaluation_teachers (evaluation_id, teacher_id) VALUES ($1, $2)", [
        evaluationId,
        teacherId,
      ]);
    }

    for (const [questionId, score] of scoreEntries) {
      await client.query(
        `INSERT INTO evaluation_scores (evaluation_id, question_id, score)
         VALUES ($1, $2, $3)
         ON CONFLICT (evaluation_id, question_id) DO UPDATE SET score = EXCLUDED.score`,
        [evaluationId, Number(questionId), score]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true, message: "บันทึกผลการประเมินสมุดบันทึกเรียบร้อยแล้ว" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Save notebook evaluation error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    client.release();
  }
}
