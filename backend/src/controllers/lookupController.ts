import type { Request, Response } from "express";
import pool from "../config/database.js";

// GET /api/majors — for the major dropdown on the registration form.
export async function listMajors(_req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      "SELECT major_id, major_name FROM majors ORDER BY major_name"
    );
    res.json({ success: true, majors: result.rows });
  } catch (error) {
    console.error("List majors error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// GET /api/teachers — for picking an advisor and two supervisor teachers.
export async function listTeachers(_req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      "SELECT teacher_id, teacher_name FROM teachers ORDER BY teacher_name"
    );
    res.json({ success: true, teachers: result.rows });
  } catch (error) {
    console.error("List teachers error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// GET /api/mentors — for picking a mentor.
export async function listMentors(_req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      "SELECT mentor_id, mentor_name FROM mentors ORDER BY mentor_name"
    );
    res.json({ success: true, mentors: result.rows });
  } catch (error) {
    console.error("List mentors error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// GET /api/religions — for the student profile form's ศาสนา dropdown.
export async function listReligions(_req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      "SELECT religion_id, religion_name FROM religions ORDER BY religion_id"
    );
    res.json({ success: true, religions: result.rows });
  } catch (error) {
    console.error("List religions error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// GET /api/provinces — for the "สถานศึกษาเดิม" จังหวัด dropdown.
export async function listProvinces(_req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      "SELECT province_id, province_name FROM provinces ORDER BY province_name"
    );
    res.json({ success: true, provinces: result.rows });
  } catch (error) {
    console.error("List provinces error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// GET /api/districts?provinceId=20 — the อำเภอ dropdown, filtered by the
// จังหวัด picked above. provinceId is required so the list stays small;
// without it we'd be shipping ~900 rows to the client for nothing.
export async function listDistricts(req: Request, res: Response): Promise<void> {
  const provinceId = Number(req.query["provinceId"]);
  if (!Number.isInteger(provinceId) || provinceId <= 0) {
    res.status(400).json({ success: false, message: "provinceId query parameter is required" });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT district_id, district_name FROM districts WHERE province_id = $1 ORDER BY district_name",
      [provinceId]
    );
    res.json({ success: true, districts: result.rows });
  } catch (error) {
    console.error("List districts error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// GET /api/subdistricts?districtId=2001 — the ตำบล dropdown for the address
// fields, filtered by the อำเภอ picked above (same reasoning as districts:
// districtId is required so we never ship the whole ~7000-row table).
export async function listSubdistricts(req: Request, res: Response): Promise<void> {
  const districtId = Number(req.query["districtId"]);
  if (!Number.isInteger(districtId) || districtId <= 0) {
    res.status(400).json({ success: false, message: "districtId query parameter is required" });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT subdistrict_id, subdistrict_name FROM subdistricts WHERE district_id = $1 ORDER BY subdistrict_name",
      [districtId]
    );
    res.json({ success: true, subdistricts: result.rows });
  } catch (error) {
    console.error("List subdistricts error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}
