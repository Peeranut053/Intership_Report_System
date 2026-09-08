import type {
  AttendanceRecordInput,
  AuthUser,
  DailyReport,
  DailyReportInput,
  District,
  EvaluationSaveInput,
  Major,
  Mentor,
  MentorAttendanceStudent,
  MentorEvaluationData,
  MentorReportRow,
  MentorStudent,
  MentorStudentHeader,
  MentorStudentsSummary,
  Province,
  RegisterPayload,
  Religion,
  StudentCoreInput,
  StudentInfoInput,
  StudentProfile,
  Subdistrict,
  Teacher,
  TeacherNotebookEvaluationData,
  TeacherNotebookEvaluationSaveInput,
  TeacherStudent,
  TeacherStudentHeader,
  TeacherStudentsSummary,
  TeacherSupervision,
  TeacherSupervisionInput,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: AuthUser;
}

interface MeResponse {
  success: boolean;
  user: AuthUser;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // No JSON body (e.g. the request never reached the server) — the
    // generic error message below covers this case.
  }

  if (!res.ok) {
    const message =
      data && typeof data === "object" && "message" in data && typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

export function login(identifier: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
}

export function registerStudent(payload: RegisterPayload): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchMe(token: string): Promise<MeResponse> {
  return request<MeResponse>("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function forgotPassword(identifier: string): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ identifier }),
  });
}

export function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}

export function fetchMajors(): Promise<{ success: boolean; majors: Major[] }> {
  return request<{ success: boolean; majors: Major[] }>("/api/majors");
}

export function fetchTeachers(): Promise<{ success: boolean; teachers: Teacher[] }> {
  return request<{ success: boolean; teachers: Teacher[] }>("/api/teachers");
}

export function fetchMentors(): Promise<{ success: boolean; mentors: Mentor[] }> {
  return request<{ success: boolean; mentors: Mentor[] }>("/api/mentors");
}

export function fetchReligions(): Promise<{ success: boolean; religions: Religion[] }> {
  return request<{ success: boolean; religions: Religion[] }>("/api/religions");
}

export function fetchProvinces(): Promise<{ success: boolean; provinces: Province[] }> {
  return request<{ success: boolean; provinces: Province[] }>("/api/provinces");
}

export function fetchDistricts(provinceId: number): Promise<{ success: boolean; districts: District[] }> {
  return request<{ success: boolean; districts: District[] }>(`/api/districts?provinceId=${provinceId}`);
}

export function fetchSubdistricts(
  districtId: number
): Promise<{ success: boolean; subdistricts: Subdistrict[] }> {
  return request<{ success: boolean; subdistricts: Subdistrict[] }>(`/api/subdistricts?districtId=${districtId}`);
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function fetchStudentProfile(token: string): Promise<{ success: boolean; profile: StudentProfile }> {
  return request<{ success: boolean; profile: StudentProfile }>("/api/students/me", {
    headers: authHeaders(token),
  });
}

// Downloads the (blank, unfilled) leave-form PDF template. Uses a manual
// fetch + blob rather than `request()`, since the response body here is a
// PDF file, not JSON — an <a href> can't carry the Authorization header, so
// the fetch reads the file into memory and hands it to the browser via a
// temporary object URL.
export async function downloadLeaveFormPdf(token: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/students/documents/leave-form`, {
    headers: authHeaders(token),
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { message?: unknown };
      if (typeof data.message === "string") message = data.message;
    } catch {
      // No JSON body — keep the generic message.
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ใบลา.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function updateStudentProfile(
  token: string,
  input: StudentCoreInput
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>("/api/students/me", {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
}

export function updateStudentInfo(
  token: string,
  input: StudentInfoInput
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>("/api/students/me/info", {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
}

export function fetchMyReports(token: string): Promise<{ success: boolean; reports: DailyReport[] }> {
  return request<{ success: boolean; reports: DailyReport[] }>("/api/reports", {
    headers: authHeaders(token),
  });
}

export function createReport(
  token: string,
  input: DailyReportInput
): Promise<{ success: boolean; report: DailyReport }> {
  return request<{ success: boolean; report: DailyReport }>("/api/reports", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
}

export function updateReport(
  token: string,
  reportId: number,
  input: DailyReportInput
): Promise<{ success: boolean; report: DailyReport }> {
  return request<{ success: boolean; report: DailyReport }>(`/api/reports/${reportId}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
}

export function deleteReport(token: string, reportId: number): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(`/api/reports/${reportId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export function fetchMentorStudents(
  token: string
): Promise<{ success: boolean; students: MentorStudent[]; summary: MentorStudentsSummary }> {
  return request<{ success: boolean; students: MentorStudent[]; summary: MentorStudentsSummary }>(
    "/api/mentor/students",
    { headers: authHeaders(token) }
  );
}

export function fetchMentorStudentReports(
  token: string,
  studentId: number
): Promise<{ success: boolean; student: MentorStudentHeader; reports: MentorReportRow[] }> {
  return request<{ success: boolean; student: MentorStudentHeader; reports: MentorReportRow[] }>(
    `/api/mentor/students/${studentId}/reports`,
    { headers: authHeaders(token) }
  );
}

export function setMentorReportChecked(
  token: string,
  reportId: number,
  checked: boolean
): Promise<{ success: boolean; checked: boolean; checkedAt: string | null }> {
  return request<{ success: boolean; checked: boolean; checkedAt: string | null }>(
    `/api/mentor/reports/${reportId}/check`,
    {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({ checked }),
    }
  );
}

export function fetchMentorAttendance(
  token: string,
  date: string
): Promise<{ success: boolean; date: string; students: MentorAttendanceStudent[] }> {
  return request<{ success: boolean; date: string; students: MentorAttendanceStudent[] }>(
    `/api/mentor/attendance?date=${encodeURIComponent(date)}`,
    { headers: authHeaders(token) }
  );
}

export function saveMentorAttendance(
  token: string,
  date: string,
  records: AttendanceRecordInput[]
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>("/api/mentor/attendance", {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ date, records }),
  });
}

export function fetchMentorEvaluation(
  token: string,
  studentId: number
): Promise<{ success: boolean } & MentorEvaluationData> {
  return request<{ success: boolean } & MentorEvaluationData>(
    `/api/mentor/students/${studentId}/evaluation`,
    { headers: authHeaders(token) }
  );
}

export function saveMentorEvaluation(
  token: string,
  studentId: number,
  input: EvaluationSaveInput
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(`/api/mentor/students/${studentId}/evaluation`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
}

export function fetchTeacherStudents(
  token: string
): Promise<{ success: boolean; students: TeacherStudent[]; summary: TeacherStudentsSummary }> {
  return request<{ success: boolean; students: TeacherStudent[]; summary: TeacherStudentsSummary }>(
    "/api/teacher/students",
    { headers: authHeaders(token) }
  );
}

export function fetchTeacherStudentSupervisions(
  token: string,
  studentId: number
): Promise<{ success: boolean; student: TeacherStudentHeader; supervisions: TeacherSupervision[] }> {
  return request<{ success: boolean; student: TeacherStudentHeader; supervisions: TeacherSupervision[] }>(
    `/api/teacher/students/${studentId}/supervisions`,
    { headers: authHeaders(token) }
  );
}

export function createTeacherSupervision(
  token: string,
  studentId: number,
  input: TeacherSupervisionInput
): Promise<{ success: boolean; supervision: TeacherSupervision }> {
  return request<{ success: boolean; supervision: TeacherSupervision }>(
    `/api/teacher/students/${studentId}/supervisions`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(input),
    }
  );
}

export function updateTeacherSupervision(
  token: string,
  supervisionId: number,
  input: TeacherSupervisionInput
): Promise<{ success: boolean; supervision: TeacherSupervision }> {
  return request<{ success: boolean; supervision: TeacherSupervision }>(
    `/api/teacher/supervisions/${supervisionId}`,
    {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify(input),
    }
  );
}

export function deleteTeacherSupervision(
  token: string,
  supervisionId: number
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(`/api/teacher/supervisions/${supervisionId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export function fetchTeacherNotebookEvaluation(
  token: string,
  studentId: number
): Promise<{ success: boolean } & TeacherNotebookEvaluationData> {
  return request<{ success: boolean } & TeacherNotebookEvaluationData>(
    `/api/teacher/students/${studentId}/notebook-evaluation`,
    { headers: authHeaders(token) }
  );
}

export function saveTeacherNotebookEvaluation(
  token: string,
  studentId: number,
  input: TeacherNotebookEvaluationSaveInput
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(
    `/api/teacher/students/${studentId}/notebook-evaluation`,
    {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify(input),
    }
  );
}
