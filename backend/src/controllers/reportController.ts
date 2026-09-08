import type { Request, Response } from "express";
import pool from "../config/database.js";
import { getStudentIdForUser } from "../utils/studentLookup.js";
import type { AuthRequest } from "../types/auth.js";

interface ReportBody {
  reportDate?: string;
  workDescription?: string;
  companyLocation?: string;
  workPlace?: string;
  supervisorName?: string;
}

const REPORT_COLUMNS = `report_id, report_date, work_description, company_location,
                         work_place, supervisor_name, created_at, updated_at`;

// A report can in principle be checked by more than one mentor (report_checks'
// PK is report_id+mentor_id), so "checked" from the student's point of view
// just means at least one mentor has marked it checked; checked_at is the
// latest such timestamp.
const CHECKED_COLUMNS = `
  EXISTS (
    SELECT 1 FROM report_checks rc WHERE rc.report_id = daily_reports.report_id AND rc.checked = true
  ) AS checked,
  (
    SELECT MAX(rc.checked_at) FROM report_checks rc WHERE rc.report_id = daily_reports.report_id AND rc.checked = true
  ) AS checked_at
`;

// GET /api/reports — the authenticated student's own report history, newest first.
export async function listMyReports(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthRequest).user!;

  try {
    const studentId = await getStudentIdForUser(authUser.id);
    if (!studentId) {
      res.status(404).json({ success: false, message: "Student profile not found" });
      return;
    }

    const result = await pool.query(
      `SELECT ${REPORT_COLUMNS}, ${CHECKED_COLUMNS}
       FROM daily_reports
       WHERE student_id = $1
       ORDER BY report_date DESC`,
      [studentId]
    );

    res.json({ success: true, reports: result.rows });
  } catch (error) {
    console.error("List reports error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// POST /api/reports — one entry per calendar day (uq_daily_reports_student_date).
export async function createReport(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthRequest).user!;
  const { reportDate, workDescription, companyLocation, workPlace, supervisorName } = req.body as ReportBody;

  if (!reportDate || !workDescription) {
    res.status(400).json({ success: false, message: "reportDate and workDescription are required" });
    return;
  }

  try {
    const studentId = await getStudentIdForUser(authUser.id);
    if (!studentId) {
      res.status(404).json({ success: false, message: "Student profile not found" });
      return;
    }

    const result = await pool.query(
      `INSERT INTO daily_reports
         (student_id, report_date, work_description, company_location, work_place, supervisor_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${REPORT_COLUMNS}, FALSE AS checked, NULL::timestamptz AS checked_at`,
      [
        studentId,
        reportDate,
        workDescription,
        companyLocation ?? null,
        workPlace ?? null,
        supervisorName ?? null,
      ]
    );

    res.status(201).json({ success: true, report: result.rows[0] });
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === "23505") {
      res.status(409).json({ success: false, message: "มีการบันทึกรายงานของวันนี้ไปแล้ว" });
      return;
    }
    console.error("Create report error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// PUT /api/reports/:id
export async function updateReport(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthRequest).user!;
  const reportId = Number(req.params["id"]);
  const { reportDate, workDescription, companyLocation, workPlace, supervisorName } = req.body as ReportBody;

  if (!Number.isFinite(reportId)) {
    res.status(400).json({ success: false, message: "Invalid report id" });
    return;
  }

  if (!reportDate || !workDescription) {
    res.status(400).json({ success: false, message: "reportDate and workDescription are required" });
    return;
  }

  try {
    const studentId = await getStudentIdForUser(authUser.id);
    if (!studentId) {
      res.status(404).json({ success: false, message: "Student profile not found" });
      return;
    }

    const result = await pool.query(
      `UPDATE daily_reports
       SET report_date = $1, work_description = $2, company_location = $3,
           work_place = $4, supervisor_name = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE report_id = $6 AND student_id = $7
       RETURNING ${REPORT_COLUMNS}, ${CHECKED_COLUMNS}`,
      [
        reportDate,
        workDescription,
        companyLocation ?? null,
        workPlace ?? null,
        supervisorName ?? null,
        reportId,
        studentId,
      ]
    );

    const report = result.rows[0];
    if (!report) {
      // Either the id doesn't exist or belongs to a different student — same
      // response either way so this can't be used to probe other students'
      // report ids.
      res.status(404).json({ success: false, message: "Report not found" });
      return;
    }

    res.json({ success: true, report });
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === "23505") {
      res.status(409).json({ success: false, message: "มีรายงานของวันนั้นอยู่แล้ว" });
      return;
    }
    console.error("Update report error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// DELETE /api/reports/:id
export async function deleteReport(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthRequest).user!;
  const reportId = Number(req.params["id"]);

  if (!Number.isFinite(reportId)) {
    res.status(400).json({ success: false, message: "Invalid report id" });
    return;
  }

  try {
    const studentId = await getStudentIdForUser(authUser.id);
    if (!studentId) {
      res.status(404).json({ success: false, message: "Student profile not found" });
      return;
    }

    const result = await pool.query("DELETE FROM daily_reports WHERE report_id = $1 AND student_id = $2", [
      reportId,
      studentId,
    ]);

    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ success: false, message: "Report not found" });
      return;
    }

    res.json({ success: true, message: "ลบรายงานเรียบร้อยแล้ว" });
  } catch (error) {
    console.error("Delete report error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}
