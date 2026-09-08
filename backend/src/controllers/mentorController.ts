import type { Request, Response } from "express";
import pool from "../config/database.js";
import { getMentorIdForUser } from "../utils/mentorLookup.js";
import type { AuthRequest } from "../types/auth.js";

// The single evaluation_categories row mentors' 20-question form belongs to
// — used to scope evaluation_questions now that other categories (e.g. the
// teacher's สมุดบันทึก notebook evaluation) can exist in the same table.
const MENTOR_EVALUATION_CATEGORY = "แบบประเมินผลการฝึกประสบการณ์วิชาชีพ (สถานประกอบการ)";

// GET /api/mentor/students — the students assigned to the logged-in mentor,
// plus summary counts for the หน้าหลัก dashboard cards.
export async function listMyStudents(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthRequest).user!;

  try {
    const mentorId = await getMentorIdForUser(authUser.id);
    if (!mentorId) {
      res.status(404).json({ success: false, message: "Mentor profile not found" });
      return;
    }

    const studentsResult = await pool.query(
      `SELECT s.student_id, s.student_code, s.first_name, s.last_name,
              maj.major_name, s.internship_place, s.internship_start, s.internship_end,
              EXISTS (
                SELECT 1 FROM submissions sub WHERE sub.student_id = s.student_id
              ) AS has_submission,
              EXISTS (
                SELECT 1 FROM daily_reports dr WHERE dr.student_id = s.student_id
              ) AS has_reports
       FROM student_mentors sm
       JOIN students s ON s.student_id = sm.student_id
       JOIN majors maj ON maj.major_id = s.major_id
       WHERE sm.mentor_id = $1
       ORDER BY s.student_code`,
      [mentorId]
    );

    const students = studentsResult.rows.map((row) => ({
      studentId: row.student_id as number,
      studentCode: row.student_code as string,
      studentName: `${row.first_name} ${row.last_name}`,
      majorName: row.major_name as string,
      internshipPlace: row.internship_place as string,
      internshipStart: row.internship_start as string,
      internshipEnd: row.internship_end as string,
      hasSubmission: row.has_submission as boolean,
      hasReports: row.has_reports as boolean,
    }));

    const summary = {
      totalStudents: students.length,
      notYetReportingCount: students.filter((s) => !s.hasReports).length,
      submittedCount: students.filter((s) => s.hasSubmission).length,
    };

    res.json({ success: true, students, summary });
  } catch (error) {
    console.error("List mentor students error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

const REPORT_COLUMNS = `dr.report_id, dr.report_date, dr.work_description, dr.company_location,
                         dr.work_place, dr.supervisor_name,
                         dr.created_at, dr.updated_at`;

// Confirms this mentor is actually assigned to this student before letting
// them read/check that student's reports — otherwise any mentor could pass
// an arbitrary studentId/reportId and read someone else's reports.
async function assertMentorOwnsStudent(mentorId: number, studentId: number): Promise<boolean> {
  const result = await pool.query(
    "SELECT 1 FROM student_mentors WHERE mentor_id = $1 AND student_id = $2",
    [mentorId, studentId]
  );
  return (result.rowCount ?? 0) > 0;
}

// GET /api/mentor/students/:studentId/reports — one student's daily report
// history plus this mentor's own checked/checked_at flag for each row.
export async function getStudentReports(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthRequest).user!;
  const studentId = Number(req.params["studentId"]);

  if (!Number.isFinite(studentId)) {
    res.status(400).json({ success: false, message: "Invalid student id" });
    return;
  }

  try {
    const mentorId = await getMentorIdForUser(authUser.id);
    if (!mentorId) {
      res.status(404).json({ success: false, message: "Mentor profile not found" });
      return;
    }

    const studentResult = await pool.query(
      `SELECT s.student_id, s.student_code, s.first_name, s.last_name, s.internship_place
       FROM student_mentors sm
       JOIN students s ON s.student_id = sm.student_id
       WHERE sm.mentor_id = $1 AND sm.student_id = $2`,
      [mentorId, studentId]
    );

    const student = studentResult.rows[0];
    if (!student) {
      // Either this student doesn't exist or isn't assigned to this mentor —
      // same response either way so this can't be used to probe other
      // mentors' students.
      res.status(404).json({ success: false, message: "Student not found" });
      return;
    }

    const reportsResult = await pool.query(
      `SELECT ${REPORT_COLUMNS}, rc.checked, rc.checked_at
       FROM daily_reports dr
       LEFT JOIN report_checks rc ON rc.report_id = dr.report_id AND rc.mentor_id = $1
       WHERE dr.student_id = $2
       ORDER BY dr.report_date DESC`,
      [mentorId, studentId]
    );

    res.json({
      success: true,
      student: {
        studentId: student.student_id,
        studentCode: student.student_code,
        studentName: `${student.first_name} ${student.last_name}`,
        internshipPlace: student.internship_place,
      },
      reports: reportsResult.rows.map((row) => ({
        ...row,
        checked: row.checked ?? false,
      })),
    });
  } catch (error) {
    console.error("Get student reports error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// PUT /api/mentor/reports/:reportId/check — mark/unmark a single report as
// reviewed by this mentor. Upserts into report_checks (pk: report_id, mentor_id).
export async function setReportChecked(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthRequest).user!;
  const reportId = Number(req.params["reportId"]);
  const { checked } = req.body as { checked?: boolean };

  if (!Number.isFinite(reportId)) {
    res.status(400).json({ success: false, message: "Invalid report id" });
    return;
  }
  if (typeof checked !== "boolean") {
    res.status(400).json({ success: false, message: "checked (boolean) is required" });
    return;
  }

  try {
    const mentorId = await getMentorIdForUser(authUser.id);
    if (!mentorId) {
      res.status(404).json({ success: false, message: "Mentor profile not found" });
      return;
    }

    const ownerCheck = await pool.query(
      `SELECT dr.student_id
       FROM daily_reports dr
       JOIN student_mentors sm ON sm.student_id = dr.student_id AND sm.mentor_id = $1
       WHERE dr.report_id = $2`,
      [mentorId, reportId]
    );
    if (ownerCheck.rowCount === 0) {
      res.status(404).json({ success: false, message: "Report not found" });
      return;
    }

    const result = await pool.query(
      `INSERT INTO report_checks (report_id, mentor_id, checked, checked_at)
       VALUES ($1, $2, $3, CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE NULL END)
       ON CONFLICT (report_id, mentor_id)
       DO UPDATE SET checked = EXCLUDED.checked, checked_at = EXCLUDED.checked_at
       RETURNING checked, checked_at`,
      [reportId, mentorId, checked]
    );

    res.json({ success: true, checked: result.rows[0].checked, checkedAt: result.rows[0].checked_at });
  } catch (error) {
    console.error("Set report checked error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

const VALID_PERIODS = new Set(["morning", "afternoon"]);
const VALID_STATUSES = new Set(["present", "late", "leave_early", "sick", "leave", "absent"]);
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/mentor/attendance?date=YYYY-MM-DD — this mentor's assigned
// students plus their เช้า/บ่าย attendance status for that single date
// (null for a half-day that hasn't been recorded yet).
export async function getAttendanceForDate(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthRequest).user!;
  const date = String(req.query["date"] ?? "");

  if (!DATE_REGEX.test(date)) {
    res.status(400).json({ success: false, message: "date (YYYY-MM-DD) is required" });
    return;
  }

  try {
    const mentorId = await getMentorIdForUser(authUser.id);
    if (!mentorId) {
      res.status(404).json({ success: false, message: "Mentor profile not found" });
      return;
    }

    const result = await pool.query(
      `SELECT s.student_id, s.student_code, s.first_name, s.last_name, s.internship_place,
              MAX(a.status) FILTER (WHERE a.period = 'morning') AS morning_status,
              MAX(a.status) FILTER (WHERE a.period = 'afternoon') AS afternoon_status
       FROM student_mentors sm
       JOIN students s ON s.student_id = sm.student_id
       LEFT JOIN attendances a ON a.student_id = s.student_id AND a.check_date = $2
       WHERE sm.mentor_id = $1
       GROUP BY s.student_id, s.student_code, s.first_name, s.last_name, s.internship_place
       ORDER BY s.student_code`,
      [mentorId, date]
    );

    res.json({
      success: true,
      date,
      students: result.rows.map((row) => ({
        studentId: row.student_id,
        studentCode: row.student_code,
        studentName: `${row.first_name} ${row.last_name}`,
        internshipPlace: row.internship_place,
        morningStatus: row.morning_status,
        afternoonStatus: row.afternoon_status,
      })),
    });
  } catch (error) {
    console.error("Get mentor attendance error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

interface AttendanceRecordInput {
  studentId?: number;
  period?: string;
  status?: string | null;
}

// PUT /api/mentor/attendance — save/clear a batch of เช้า/บ่าย statuses for
// one date in a single request (the "บันทึกรายการ" save button). A null/empty
// status deletes that half-day's row instead of storing an empty value.
export async function saveAttendance(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthRequest).user!;
  const { date, records } = req.body as { date?: string; records?: AttendanceRecordInput[] };

  if (!date || !DATE_REGEX.test(date)) {
    res.status(400).json({ success: false, message: "date (YYYY-MM-DD) is required" });
    return;
  }
  if (!Array.isArray(records) || records.length === 0) {
    res.status(400).json({ success: false, message: "records must be a non-empty array" });
    return;
  }
  for (const record of records) {
    if (!Number.isFinite(record.studentId) || !record.period || !VALID_PERIODS.has(record.period)) {
      res.status(400).json({ success: false, message: "Each record needs a valid studentId and period" });
      return;
    }
    if (record.status && !VALID_STATUSES.has(record.status)) {
      res.status(400).json({ success: false, message: `Invalid status: ${record.status}` });
      return;
    }
  }

  const client = await pool.connect();
  try {
    const mentorId = await getMentorIdForUser(authUser.id);
    if (!mentorId) {
      res.status(404).json({ success: false, message: "Mentor profile not found" });
      return;
    }

    const ownedResult = await client.query("SELECT student_id FROM student_mentors WHERE mentor_id = $1", [
      mentorId,
    ]);
    const ownedStudentIds = new Set(ownedResult.rows.map((r) => r.student_id as number));

    const notOwned = records.some((r) => !ownedStudentIds.has(r.studentId as number));
    if (notOwned) {
      res.status(403).json({ success: false, message: "One or more students are not assigned to you" });
      return;
    }

    await client.query("BEGIN");
    for (const record of records) {
      if (record.status) {
        await client.query(
          `INSERT INTO attendances (student_id, mentor_id, check_date, period, status)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (student_id, check_date, period)
           DO UPDATE SET status = EXCLUDED.status, mentor_id = EXCLUDED.mentor_id`,
          [record.studentId, mentorId, date, record.period, record.status]
        );
      } else {
        await client.query(
          "DELETE FROM attendances WHERE student_id = $1 AND check_date = $2 AND period = $3",
          [record.studentId, date, record.period]
        );
      }
    }
    await client.query("COMMIT");

    res.json({ success: true, message: "บันทึกการเช็คชื่อเรียบร้อยแล้ว" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Save mentor attendance error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    client.release();
  }
}

// GET /api/mentor/students/:studentId/evaluation — student header info,
// an attendance summary computed live from `attendances` (no manual entry
// needed), the fixed 20-question scoring form (evaluation_questions), this
// mentor's own saved scores/comments if a draft already exists, and the
// running total.
export async function getStudentEvaluation(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthRequest).user!;
  const studentId = Number(req.params["studentId"]);

  if (!Number.isFinite(studentId)) {
    res.status(400).json({ success: false, message: "Invalid student id" });
    return;
  }

  try {
    const mentorId = await getMentorIdForUser(authUser.id);
    if (!mentorId) {
      res.status(404).json({ success: false, message: "Mentor profile not found" });
      return;
    }

    const studentResult = await pool.query(
      `SELECT s.student_id, s.student_code, s.first_name, s.last_name, s.internship_place,
              s.internship_start, s.internship_end, s.semester, s.year_level, maj.major_name
       FROM student_mentors sm
       JOIN students s ON s.student_id = sm.student_id
       JOIN majors maj ON maj.major_id = s.major_id
       WHERE sm.mentor_id = $1 AND sm.student_id = $2`,
      [mentorId, studentId]
    );
    const student = studentResult.rows[0];
    if (!student) {
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

    // Filtered by category — evaluation_questions can now hold more than one
    // form's worth of questions (e.g. the teacher's สมุดบันทึก evaluation
    // added later), so the mentor's 20-question set must be scoped by name
    // instead of reading the whole table.
    const questionsResult = await pool.query(
      `SELECT eq.question_id, eq.question_no, eq.question
       FROM evaluation_questions eq
       JOIN evaluation_categories ec ON ec.category_id = eq.category_id
       WHERE ec.category_name = $1
       ORDER BY eq.question_no`,
      [MENTOR_EVALUATION_CATEGORY]
    );

    const existingResult = await pool.query(
      `SELECT ef.evaluation_id
       FROM evaluation_forms ef
       JOIN evaluation_mentors em ON em.evaluation_id = ef.evaluation_id
       WHERE ef.student_id = $1 AND em.mentor_id = $2 AND ef.evaluator_type = 'mentor'
       LIMIT 1`,
      [studentId, mentorId]
    );
    const evaluationId = existingResult.rows[0]?.evaluation_id as number | undefined;

    let scoresByQuestion: Record<number, number> = {};
    let details = { problemNote: "", suggestion: "", specialSkill: "", otherComment: "" };

    if (evaluationId) {
      const scoresResult = await pool.query(
        "SELECT question_id, score FROM evaluation_scores WHERE evaluation_id = $1",
        [evaluationId]
      );
      scoresByQuestion = Object.fromEntries(scoresResult.rows.map((r) => [r.question_id, r.score]));

      const detailsResult = await pool.query(
        "SELECT problem_note, suggestion, special_skill, other_comment FROM mentor_evaluation_details WHERE evaluation_id = $1",
        [evaluationId]
      );
      if (detailsResult.rows[0]) {
        const d = detailsResult.rows[0];
        details = {
          problemNote: d.problem_note ?? "",
          suggestion: d.suggestion ?? "",
          specialSkill: d.special_skill ?? "",
          otherComment: d.other_comment ?? "",
        };
      }
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
      details,
    });
  } catch (error) {
    console.error("Get mentor evaluation error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

interface EvaluationSaveBody {
  scores?: Record<string, number>;
  problemNote?: string;
  suggestion?: string;
  specialSkill?: string;
  otherComment?: string;
}

// PUT /api/mentor/students/:studentId/evaluation — creates the mentor's
// evaluation_forms row on first save (find-or-create), then upserts scores
// and the free-text detail fields. Partial saves are allowed — a mentor can
// come back and fill in the rest later.
export async function saveStudentEvaluation(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthRequest).user!;
  const studentId = Number(req.params["studentId"]);
  const { scores, problemNote, suggestion, specialSkill, otherComment } = req.body as EvaluationSaveBody;

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
    const mentorId = await getMentorIdForUser(authUser.id);
    if (!mentorId) {
      res.status(404).json({ success: false, message: "Mentor profile not found" });
      return;
    }

    const owned = await client.query(
      "SELECT 1 FROM student_mentors WHERE mentor_id = $1 AND student_id = $2",
      [mentorId, studentId]
    );
    if (owned.rowCount === 0) {
      res.status(404).json({ success: false, message: "Student not found" });
      return;
    }

    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT ef.evaluation_id
       FROM evaluation_forms ef
       JOIN evaluation_mentors em ON em.evaluation_id = ef.evaluation_id
       WHERE ef.student_id = $1 AND em.mentor_id = $2 AND ef.evaluator_type = 'mentor'
       LIMIT 1`,
      [studentId, mentorId]
    );

    let evaluationId = existing.rows[0]?.evaluation_id as number | undefined;
    if (!evaluationId) {
      const created = await client.query(
        `INSERT INTO evaluation_forms (student_id, evaluator_type, category_id)
         VALUES ($1, 'mentor', (SELECT category_id FROM evaluation_categories WHERE category_name = $2))
         RETURNING evaluation_id`,
        [studentId, MENTOR_EVALUATION_CATEGORY]
      );
      evaluationId = created.rows[0].evaluation_id;
      await client.query("INSERT INTO evaluation_mentors (evaluation_id, mentor_id) VALUES ($1, $2)", [
        evaluationId,
        mentorId,
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

    await client.query(
      `INSERT INTO mentor_evaluation_details (evaluation_id, problem_note, suggestion, special_skill, other_comment)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (evaluation_id) DO UPDATE SET
         problem_note = EXCLUDED.problem_note,
         suggestion = EXCLUDED.suggestion,
         special_skill = EXCLUDED.special_skill,
         other_comment = EXCLUDED.other_comment`,
      [evaluationId, problemNote ?? null, suggestion ?? null, specialSkill ?? null, otherComment ?? null]
    );

    await client.query("COMMIT");
    res.json({ success: true, message: "บันทึกผลการประเมินเรียบร้อยแล้ว" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Save mentor evaluation error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    client.release();
  }
}
