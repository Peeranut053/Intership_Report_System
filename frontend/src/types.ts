export type Role = "student" | "teacher" | "mentor";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface Major {
  major_id: number;
  major_name: string;
}

export interface Teacher {
  teacher_id: number;
  teacher_name: string;
}

export interface Mentor {
  mentor_id: number;
  mentor_name: string;
}

export interface Religion {
  religion_id: number;
  religion_name: string;
}

export interface Province {
  province_id: number;
  province_name: string;
}

export interface District {
  district_id: number;
  district_name: string;
}

export interface Subdistrict {
  subdistrict_id: number;
  subdistrict_name: string;
}

// permanentAddress/currentAddress on StudentProfile — see
// backend/src/controllers/studentController.ts (serializeAddress)
export interface StudentAddress {
  houseNum: string | null;
  road: string | null;
  subdistrictId: number;
  subdistrictName: string;
  districtId: number;
  districtName: string;
  provinceId: number;
  provinceName: string;
}

// Matches what POST /api/auth/register expects — see
// backend/src/controllers/authController.ts and utils/studentRelations.ts.
export interface RegisterPayload {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  studentCode: string;
  majorId: number;
  internshipPlace: string;
  internshipStart: string;
  internshipEnd: string;
  mentorId: number;
  advisorTeacherId: number;
  supervisorTeacherIds: number[];
}

// GET /api/students/me — see backend/src/controllers/studentController.ts
export interface StudentProfile {
  studentId: number;
  studentCode: string;
  firstName: string;
  lastName: string;
  studentName: string;
  majorName: string;
  yearLevel: number;
  semester: number;
  internshipPlace: string;
  internshipStart: string;
  internshipEnd: string;
  advisorTeacherId: number | null;
  advisorTeacherName: string | null;
  supervisorTeacherIds: number[];
  supervisorTeacherNames: string[];
  mentorId: number | null;
  mentorName: string | null;
  // Editable personal/family/education fields (student_info + phones) —
  // null until the student saves the profile form for the first time.
  birthDate: string | null;
  religionId: number | null;
  religionName: string | null;
  phoneMobile: string | null;
  fatherName: string | null;
  fatherJob: string | null;
  motherName: string | null;
  motherJob: string | null;
  pastEducation: string | null;
  pastSchool: string | null;
  schoolProvinceId: number | null;
  schoolProvinceName: string | null;
  schoolDistrictId: number | null;
  schoolDistrictName: string | null;
  specialSkill: string | null;
  specialInterest: string | null;
  permanentAddress: StudentAddress | null;
  currentAddress: StudentAddress | null;
}

// PUT /api/students/me — see backend/src/controllers/studentController.ts
export interface StudentCoreInput {
  studentCode: string;
  firstName: string;
  lastName: string;
  internshipPlace: string;
  internshipStart: string;
  internshipEnd: string;
  mentorId: number;
  advisorTeacherId: number;
  supervisorTeacherIds: number[];
}

// PUT /api/students/me/info — see backend/src/controllers/studentController.ts
export interface StudentInfoInput {
  birthDate: string;
  religionId: number | null;
  phoneMobile: string;
  fatherName: string;
  fatherJob: string;
  motherName: string;
  motherJob: string;
  pastEducation: string;
  pastSchool: string;
  schoolDistrictId: number | null;
  specialSkill: string;
  specialInterest: string;
  permanentHouseNum: string;
  permanentRoad: string;
  permanentSubdistrictId: number | null;
  currentHouseNum: string;
  currentRoad: string;
  currentSubdistrictId: number | null;
}

// daily_reports rows — see backend/src/controllers/reportController.ts
export interface DailyReport {
  report_id: number;
  report_date: string;
  work_description: string;
  company_location: string | null;
  work_place: string | null;
  supervisor_name: string | null;
  created_at: string;
  updated_at: string;
  checked: boolean;
  checked_at: string | null;
}

export interface DailyReportInput {
  reportDate: string;
  workDescription: string;
  companyLocation: string;
  workPlace: string;
  supervisorName: string;
}

// GET /api/mentor/students — a mentor's assigned-student roster.
export interface MentorStudent {
  studentId: number;
  studentCode: string;
  studentName: string;
  majorName: string;
  internshipPlace: string;
  internshipStart: string;
  internshipEnd: string;
  hasSubmission: boolean;
  hasReports: boolean;
}

export interface MentorStudentsSummary {
  totalStudents: number;
  notYetReportingCount: number;
  submittedCount: number;
}

// GET /api/mentor/students/:studentId/reports
export interface MentorReportRow {
  report_id: number;
  report_date: string;
  work_description: string;
  company_location: string | null;
  work_place: string | null;
  supervisor_name: string | null;
  created_at: string;
  updated_at: string;
  checked: boolean;
  checked_at: string | null;
}

export interface MentorStudentHeader {
  studentId: number;
  studentCode: string;
  studentName: string;
  internshipPlace: string;
}

// attendances.status — matches the CHECK constraint in the schema.
export type AttendanceStatus = "present" | "late" | "leave_early" | "sick" | "leave" | "absent";
export type AttendancePeriod = "morning" | "afternoon";

// GET /api/mentor/attendance?date=YYYY-MM-DD
export interface MentorAttendanceStudent {
  studentId: number;
  studentCode: string;
  studentName: string;
  internshipPlace: string;
  morningStatus: AttendanceStatus | null;
  afternoonStatus: AttendanceStatus | null;
}

export interface AttendanceRecordInput {
  studentId: number;
  period: AttendancePeriod;
  status: AttendanceStatus | null;
}

// GET /api/mentor/students/:studentId/evaluation
export interface EvaluationStudentHeader {
  studentId: number;
  studentCode: string;
  studentName: string;
  majorName: string;
  internshipPlace: string;
  internshipStart: string;
  internshipEnd: string;
  semester: number;
  yearLevel: number;
}

export interface EvaluationAttendanceSummary {
  sickCount: number;
  leaveCount: number;
  absentCount: number;
  presentCount: number;
}

export interface EvaluationQuestion {
  questionId: number;
  questionNo: number;
  question: string;
  score: number | null;
}

export interface EvaluationDetails {
  problemNote: string;
  suggestion: string;
  specialSkill: string;
  otherComment: string;
}

export interface MentorEvaluationData {
  student: EvaluationStudentHeader;
  attendanceSummary: EvaluationAttendanceSummary;
  questions: EvaluationQuestion[];
  maxScore: number;
  totalScore: number;
  details: EvaluationDetails;
}

export interface EvaluationSaveInput {
  scores: Record<number, number>;
  problemNote: string;
  suggestion: string;
  specialSkill: string;
  otherComment: string;
}

export type TeacherRole = "advisor" | "supervisor";

// GET /api/teacher/students — a teacher's assigned-student roster. A
// student can be assigned to the same teacher as both อาจารย์ที่ปรึกษา
// (advisor) and อาจารย์นิเทศ (supervisor), so `roles` can hold both.
export interface TeacherStudent {
  studentId: number;
  studentCode: string;
  studentName: string;
  majorName: string;
  internshipPlace: string;
  internshipStart: string;
  internshipEnd: string;
  roles: TeacherRole[];
  hasSubmission: boolean;
  hasReports: boolean;
}

export interface TeacherStudentsSummary {
  totalStudents: number;
  advisorCount: number;
  supervisorCount: number;
}

export interface TeacherStudentHeader {
  studentId: number;
  studentCode: string;
  studentName: string;
  internshipPlace: string;
}

// One topic covered during a supervision visit, each with its own detail.
export interface TeacherSupervisionTopic {
  topicId: number | null;
  topic: string;
  detail: string | null;
}

// GET /api/teacher/students/:studentId/supervisions — one บันทึกการนิเทศ
// entry (one visit date, possibly covering several topics).
export interface TeacherSupervision {
  supervision_id: number;
  supervision_date: string;
  topics: TeacherSupervisionTopic[];
}

export interface TeacherSupervisionTopicInput {
  topic: string;
  detail: string;
}

export interface TeacherSupervisionInput {
  supervisionDate: string;
  topics: TeacherSupervisionTopicInput[];
}

// GET /api/teacher/students/:studentId/notebook-evaluation — the 5-question
// แบบประเมินผลสมุดบันทึก (daily-report notebook evaluation, สำหรับอาจารย์นิเทศ).
// Reuses the same student-header/attendance/question shapes as the mentor's
// evaluation form since both forms follow the same structure.
export interface TeacherNotebookEvaluationData {
  student: EvaluationStudentHeader;
  attendanceSummary: EvaluationAttendanceSummary;
  questions: EvaluationQuestion[];
  maxScore: number;
  totalScore: number;
}

export interface TeacherNotebookEvaluationSaveInput {
  scores: Record<number, number>;
}
