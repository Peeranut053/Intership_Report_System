import type { Request, Response } from "express";
import pool from "../config/database.js";
import type { AuthRequest } from "../types/auth.js";
import { isValidStudentCode, mapPgConstraintError } from "../utils/validators.js";
import { replaceStudentRelations, validateStudentRelations } from "../utils/studentRelations.js";

const MOBILE_PHONE_TYPE = "โทรศัพท์มือถือ";
const PHONE_NUMBER_REGEX = /^[0-9]{9,10}$/;
const ADDRESS_TYPE_PERMANENT = "ที่อยู่ตามทะเบียนบ้าน";
const ADDRESS_TYPE_CURRENT = "ที่อยู่ปัจจุบัน";

interface AddressRow {
  house_num: string | null;
  road: string | null;
  subdistrict_id: number;
  subdistrict_name: string;
  district_id: number;
  district_name: string;
  province_id: number;
  province_name: string;
}

function serializeAddress(row: AddressRow | undefined) {
  if (!row) return null;
  return {
    houseNum: row.house_num,
    road: row.road,
    subdistrictId: row.subdistrict_id,
    subdistrictName: row.subdistrict_name,
    districtId: row.district_id,
    districtName: row.district_name,
    provinceId: row.province_id,
    provinceName: row.province_name,
  };
}

// GET /api/students/me — everything the daily-report page's read-only header
// needs (company, student identity, major, advisor + 2 supervisors), plus
// the editable personal/family/education fields for the "ข้อมูลนักศึกษา" page.
export async function getMyProfile(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthRequest).user;
  if (!authUser) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    const studentResult = await pool.query<{
      student_id: number;
      student_code: string;
      first_name: string;
      last_name: string;
      year_level: number;
      semester: number;
      internship_place: string;
      internship_start: string;
      internship_end: string;
      major_name: string;
      birth_date: string | null;
      religion_id: number | null;
      religion_name: string | null;
      father_name: string | null;
      father_job: string | null;
      mother_name: string | null;
      mother_job: string | null;
      past_education: string | null;
      past_school: string | null;
      school_district_id: number | null;
      school_district_name: string | null;
      school_province_id: number | null;
      school_province_name: string | null;
      special_skill: string | null;
      special_interest: string | null;
    }>(
      `SELECT s.student_id, s.student_code, s.first_name, s.last_name, s.year_level, s.semester,
              s.internship_place, s.internship_start, s.internship_end, m.major_name,
              si.birth_date, si.religion_id, r.religion_name,
              si.father_name, si.father_job, si.mother_name, si.mother_job,
              si.past_education, si.past_school,
              si.school_district_id, d.district_name AS school_district_name,
              d.province_id AS school_province_id, p.province_name AS school_province_name,
              si.special_skill, si.special_interest
       FROM students s
       JOIN majors m ON m.major_id = s.major_id
       LEFT JOIN student_info si ON si.student_id = s.student_id
       LEFT JOIN religions r ON r.religion_id = si.religion_id
       LEFT JOIN districts d ON d.district_id = si.school_district_id
       LEFT JOIN provinces p ON p.province_id = d.province_id
       WHERE s.user_id = $1`,
      [authUser.id]
    );

    const student = studentResult.rows[0];
    if (!student) {
      res.status(404).json({ success: false, message: "Student profile not found" });
      return;
    }

    const teachersResult = await pool.query<{
      teacher_id: number;
      teacher_role: "advisor" | "supervisor";
      teacher_name: string;
    }>(
      `SELECT st.teacher_id, st.teacher_role, t.teacher_name
       FROM student_teachers st
       JOIN teachers t ON t.teacher_id = st.teacher_id
       WHERE st.student_id = $1
       ORDER BY st.teacher_id`,
      [student.student_id]
    );

    const advisorTeacher = teachersResult.rows.find((row) => row.teacher_role === "advisor") ?? null;
    const supervisorTeachers = teachersResult.rows.filter((row) => row.teacher_role === "supervisor");

    const mentorResult = await pool.query<{ mentor_id: number; mentor_name: string }>(
      `SELECT mt.mentor_id, mt.mentor_name
       FROM student_mentors sm
       JOIN mentors mt ON mt.mentor_id = sm.mentor_id
       WHERE sm.student_id = $1
       LIMIT 1`,
      [student.student_id]
    );

    const phoneResult = await pool.query<{ phone_number: string }>(
      `SELECT ph.phone_number
       FROM phones ph
       JOIN phone_types pt ON pt.phone_type_id = ph.phone_type_id
       WHERE ph.student_id = $1 AND pt.phone_type = $2
       LIMIT 1`,
      [student.student_id, MOBILE_PHONE_TYPE]
    );

    const addressResult = await pool.query<AddressRow & { type_name: string }>(
      `SELECT at.type_name, a.house_num, a.road, a.subdistrict_id,
              sd.subdistrict_name, sd.district_id, d.district_name,
              d.province_id, p.province_name
       FROM addresses a
       JOIN address_types at ON at.type_id = a.type_id
       JOIN subdistricts sd ON sd.subdistrict_id = a.subdistrict_id
       JOIN districts d ON d.district_id = sd.district_id
       JOIN provinces p ON p.province_id = d.province_id
       WHERE a.student_id = $1`,
      [student.student_id]
    );
    const permanentAddressRow = addressResult.rows.find((row) => row.type_name === ADDRESS_TYPE_PERMANENT);
    const currentAddressRow = addressResult.rows.find((row) => row.type_name === ADDRESS_TYPE_CURRENT);

    res.json({
      success: true,
      profile: {
        studentId: student.student_id,
        studentCode: student.student_code,
        firstName: student.first_name,
        lastName: student.last_name,
        // Combined display name kept for pages that just need "the name"
        // (e.g. the daily-report header) — the underlying columns are split.
        studentName: `${student.first_name} ${student.last_name}`,
        majorName: student.major_name,
        yearLevel: student.year_level,
        semester: student.semester,
        internshipPlace: student.internship_place,
        internshipStart: student.internship_start,
        internshipEnd: student.internship_end,
        advisorTeacherId: advisorTeacher?.teacher_id ?? null,
        advisorTeacherName: advisorTeacher?.teacher_name ?? null,
        supervisorTeacherIds: supervisorTeachers.map((row) => row.teacher_id),
        supervisorTeacherNames: supervisorTeachers.map((row) => row.teacher_name),
        mentorId: mentorResult.rows[0]?.mentor_id ?? null,
        mentorName: mentorResult.rows[0]?.mentor_name ?? null,
        birthDate: student.birth_date,
        religionId: student.religion_id,
        religionName: student.religion_name,
        phoneMobile: phoneResult.rows[0]?.phone_number ?? null,
        fatherName: student.father_name,
        fatherJob: student.father_job,
        motherName: student.mother_name,
        motherJob: student.mother_job,
        pastEducation: student.past_education,
        pastSchool: student.past_school,
        schoolProvinceId: student.school_province_id,
        schoolProvinceName: student.school_province_name,
        schoolDistrictId: student.school_district_id,
        schoolDistrictName: student.school_district_name,
        specialSkill: student.special_skill,
        specialInterest: student.special_interest,
        permanentAddress: serializeAddress(permanentAddressRow),
        currentAddress: serializeAddress(currentAddressRow),
      },
    });
  } catch (error) {
    console.error("Get my profile error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// PUT /api/students/me/info — upserts the editable personal/family/education
// fields (student_info table, created lazily on first save) plus the mobile
// phone number (phones table). Academic/internship/personnel fields are NOT
// editable here — those come from registration/admin and stay read-only on
// the frontend (changing an advisor/supervisor/mentor is a bigger, validated
// operation handled elsewhere, not a casual profile edit).
export async function updateMyInfo(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthRequest).user;
  if (!authUser) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  const {
    birthDate,
    religionId,
    phoneMobile,
    fatherName,
    fatherJob,
    motherName,
    motherJob,
    pastEducation,
    pastSchool,
    schoolDistrictId,
    specialSkill,
    specialInterest,
    permanentHouseNum,
    permanentRoad,
    permanentSubdistrictId,
    currentHouseNum,
    currentRoad,
    currentSubdistrictId,
  } = req.body as Record<string, unknown>;

  if (typeof birthDate !== "string" || birthDate.trim() === "") {
    res.status(400).json({ success: false, message: "birthDate is required" });
    return;
  }

  if (
    typeof phoneMobile === "string" &&
    phoneMobile.trim() !== "" &&
    !PHONE_NUMBER_REGEX.test(phoneMobile)
  ) {
    res.status(400).json({ success: false, message: "phoneMobile must be 9-10 digits" });
    return;
  }

  // addresses.subdistrict_id is NOT NULL — a house number/road with no
  // ตำบล selected can't be saved as a row, so reject that combination
  // instead of silently dropping the house number/road.
  const hasPartialPermanent =
    (typeof permanentHouseNum === "string" && permanentHouseNum.trim() !== "") ||
    (typeof permanentRoad === "string" && permanentRoad.trim() !== "");
  if (hasPartialPermanent && !permanentSubdistrictId) {
    res.status(400).json({ success: false, message: "กรุณาเลือกตำบลสำหรับที่อยู่ตามทะเบียนบ้าน" });
    return;
  }

  const hasPartialCurrent =
    (typeof currentHouseNum === "string" && currentHouseNum.trim() !== "") ||
    (typeof currentRoad === "string" && currentRoad.trim() !== "");
  if (hasPartialCurrent && !currentSubdistrictId) {
    res.status(400).json({ success: false, message: "กรุณาเลือกตำบลสำหรับที่อยู่ปัจจุบัน" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const studentResult = await client.query<{ student_id: number }>(
      "SELECT student_id FROM students WHERE user_id = $1",
      [authUser.id]
    );
    const studentId = studentResult.rows[0]?.student_id;
    if (!studentId) {
      await client.query("ROLLBACK");
      res.status(404).json({ success: false, message: "Student profile not found" });
      return;
    }

    await client.query(
      `INSERT INTO student_info (
         student_id, birth_date, religion_id, father_name, father_job,
         mother_name, mother_job, past_education, past_school,
         school_district_id, special_skill, special_interest
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (student_id) DO UPDATE SET
         birth_date = EXCLUDED.birth_date,
         religion_id = EXCLUDED.religion_id,
         father_name = EXCLUDED.father_name,
         father_job = EXCLUDED.father_job,
         mother_name = EXCLUDED.mother_name,
         mother_job = EXCLUDED.mother_job,
         past_education = EXCLUDED.past_education,
         past_school = EXCLUDED.past_school,
         school_district_id = EXCLUDED.school_district_id,
         special_skill = EXCLUDED.special_skill,
         special_interest = EXCLUDED.special_interest`,
      [
        studentId,
        birthDate,
        religionId || null,
        fatherName || null,
        fatherJob || null,
        motherName || null,
        motherJob || null,
        pastEducation || null,
        pastSchool || null,
        schoolDistrictId || null,
        specialSkill || null,
        specialInterest || null,
      ]
    );

    if (typeof phoneMobile === "string" && phoneMobile.trim() !== "") {
      const phoneTypeResult = await client.query<{ phone_type_id: number }>(
        "SELECT phone_type_id FROM phone_types WHERE phone_type = $1",
        [MOBILE_PHONE_TYPE]
      );
      const mobileTypeId = phoneTypeResult.rows[0]?.phone_type_id;
      if (mobileTypeId) {
        const existingPhone = await client.query<{ phone_id: number }>(
          "SELECT phone_id FROM phones WHERE student_id = $1 AND phone_type_id = $2",
          [studentId, mobileTypeId]
        );
        if (existingPhone.rows[0]) {
          await client.query("UPDATE phones SET phone_number = $1 WHERE phone_id = $2", [
            phoneMobile,
            existingPhone.rows[0].phone_id,
          ]);
        } else {
          await client.query(
            "INSERT INTO phones (student_id, phone_type_id, phone_number) VALUES ($1, $2, $3)",
            [studentId, mobileTypeId, phoneMobile]
          );
        }
      }
    }

    async function upsertAddress(
      typeName: string,
      houseNum: unknown,
      road: unknown,
      subdistrictId: unknown
    ): Promise<void> {
      if (!subdistrictId) return; // nothing to save without a required ตำบล

      const typeResult = await client.query<{ type_id: number }>(
        "SELECT type_id FROM address_types WHERE type_name = $1",
        [typeName]
      );
      const typeId = typeResult.rows[0]?.type_id;
      if (!typeId) return; // seeded data missing — shouldn't happen

      await client.query(
        `INSERT INTO addresses (student_id, type_id, house_num, road, subdistrict_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (student_id, type_id) DO UPDATE SET
           house_num = EXCLUDED.house_num,
           road = EXCLUDED.road,
           subdistrict_id = EXCLUDED.subdistrict_id`,
        [studentId, typeId, houseNum || null, road || null, subdistrictId]
      );
    }

    await upsertAddress(ADDRESS_TYPE_PERMANENT, permanentHouseNum, permanentRoad, permanentSubdistrictId);
    await upsertAddress(ADDRESS_TYPE_CURRENT, currentHouseNum, currentRoad, currentSubdistrictId);

    await client.query("COMMIT");
    res.json({ success: true, message: "อัปเดตข้อมูลนักศึกษาเรียบร้อย" });
  } catch (error) {
    await client.query("ROLLBACK");
    const mapped = mapPgConstraintError(error);
    if (mapped) {
      res.status(mapped.status).json({ success: false, message: mapped.message });
      return;
    }
    console.error("Update my info error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    client.release();
  }
}

// PUT /api/students/me — lets a student edit the fields that were originally
// fixed at registration: student code, name, internship place/dates, and
// their advisor/2 supervisors/mentor. Validation mirrors register() in
// authController.ts. major/year/semester stay out of scope here — those
// aren't in the requested edit set and year/semester are DB-locked to 4/2
// anyway (chk_students_year / chk_students_semester).
export async function updateMyProfile(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthRequest).user;
  if (!authUser) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  const {
    studentCode,
    firstName,
    lastName,
    internshipPlace,
    internshipStart,
    internshipEnd,
    mentorId,
    advisorTeacherId,
    supervisorTeacherIds,
  } = req.body as Record<string, unknown>;

  if (
    typeof studentCode !== "string" ||
    typeof firstName !== "string" ||
    !firstName.trim() ||
    typeof lastName !== "string" ||
    !lastName.trim() ||
    typeof internshipPlace !== "string" ||
    !internshipPlace.trim() ||
    typeof internshipStart !== "string" ||
    !internshipStart ||
    typeof internshipEnd !== "string" ||
    !internshipEnd
  ) {
    res.status(400).json({
      success: false,
      message: "studentCode, firstName, lastName, internshipPlace, internshipStart and internshipEnd are all required",
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
  const relations = relationsResult.value;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const studentResult = await client.query<{ student_id: number }>(
      "SELECT student_id FROM students WHERE user_id = $1",
      [authUser.id]
    );
    const studentId = studentResult.rows[0]?.student_id;
    if (!studentId) {
      await client.query("ROLLBACK");
      res.status(404).json({ success: false, message: "Student profile not found" });
      return;
    }

    await client.query(
      `UPDATE students
       SET student_code = $1, first_name = $2, last_name = $3,
           internship_place = $4, internship_start = $5, internship_end = $6
       WHERE student_id = $7`,
      [studentCode, firstName, lastName, internshipPlace, internshipStart, internshipEnd, studentId]
    );

    await replaceStudentRelations(client, studentId, relations);

    await client.query("COMMIT");
    res.json({ success: true, message: "อัปเดตข้อมูลนักศึกษาเรียบร้อย" });
  } catch (error) {
    await client.query("ROLLBACK");
    const mapped = mapPgConstraintError(error);
    if (mapped) {
      res.status(mapped.status).json({ success: false, message: mapped.message });
      return;
    }
    console.error("Update my profile error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    client.release();
  }
}
