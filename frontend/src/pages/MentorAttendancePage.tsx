import { useEffect, useMemo, useState } from "react";
import { fetchMentorAttendance, saveMentorAttendance } from "../api";
import type { AttendanceRecordInput, AttendanceStatus, MentorAttendanceStudent } from "../types";
import { todayIso } from "../utils/dateFormat";

interface MentorAttendancePageProps {
  token: string;
}

interface StatusOption {
  value: AttendanceStatus | "";
  label: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: "", label: "— ยังไม่บันทึก —" },
  { value: "present", label: "มา" },
  { value: "late", label: "สาย" },
  { value: "leave_early", label: "กลับก่อน" },
  { value: "sick", label: "ป่วย" },
  { value: "leave", label: "ลา" },
  { value: "absent", label: "ขาด" },
];

// Local editable copy of one student's เช้า/บ่าย selections, keyed by
// studentId — separate from the fetched MentorAttendanceStudent[] so the
// dropdowns can be edited freely before "บันทึกรายการ" sends them all at once.
type EditState = Record<number, { morning: AttendanceStatus | ""; afternoon: AttendanceStatus | "" }>;

export function MentorAttendancePage({ token }: MentorAttendancePageProps) {
  const [date, setDate] = useState(todayIso());
  const [students, setStudents] = useState<MentorAttendanceStudent[]>([]);
  const [edits, setEdits] = useState<EditState>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSaveMessage(null);
    setSaveError(null);
    fetchMentorAttendance(token, date)
      .then((res) => {
        if (cancelled) return;
        setStudents(res.students);
        const nextEdits: EditState = {};
        for (const s of res.students) {
          nextEdits[s.studentId] = {
            morning: s.morningStatus ?? "",
            afternoon: s.afternoonStatus ?? "",
          };
        }
        setEdits(nextEdits);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, date]);

  function updateEdit(studentId: number, period: "morning" | "afternoon", value: string) {
    setEdits((prev) => {
      const current = prev[studentId] ?? { morning: "", afternoon: "" };
      return {
        ...prev,
        [studentId]: { ...current, [period]: value as AttendanceStatus | "" },
      };
    });
    setSaveMessage(null);
  }

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.studentCode.toLowerCase().includes(q) || s.studentName.toLowerCase().includes(q)
    );
  }, [students, search]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const records: AttendanceRecordInput[] = [];
      for (const s of students) {
        const edit = edits[s.studentId];
        if (!edit) continue;
        records.push({
          studentId: s.studentId,
          period: "morning",
          status: edit.morning === "" ? null : edit.morning,
        });
        records.push({
          studentId: s.studentId,
          period: "afternoon",
          status: edit.afternoon === "" ? null : edit.afternoon,
        });
      }
      await saveMentorAttendance(token, date, records);
      setSaveMessage("บันทึกรายการเรียบร้อยแล้ว");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "บันทึกรายการไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p>กำลังโหลดข้อมูล...</p>;
  }

  if (loadError) {
    return <p className="form-error">{loadError}</p>;
  }

  return (
    <div className="report-page">
      <div className="report-card">
        <div className="mentor-table-toolbar">
          <h2 className="report-title mentor-attendance-title">ระบบเช็คชื่อนักศึกษา</h2>
          <input
            className="input-plain mentor-date-input"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <p className="auth-hint">จัดการการเข้าเรียนและฝึกงานของนักศึกษาในความดูแล — แยกช่วงเช้า/บ่ายต่อวัน</p>

        <div className="mentor-table-toolbar mentor-attendance-toolbar">
          <input
            className="input-plain mentor-search-input"
            placeholder="ค้นหาชื่อหรือรหัสนักศึกษา..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึกรายการ"}
          </button>
        </div>

        {saveMessage && <p className="form-success">{saveMessage}</p>}
        {saveError && <p className="form-error">{saveError}</p>}

        <div className="mentor-table-wrap">
          <table className="mentor-table">
            <thead>
              <tr>
                <th>ข้อมูลนักศึกษา</th>
                <th>เช้า</th>
                <th>บ่าย</th>
                <th>สถานที่ฝึก</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => {
                const edit = edits[s.studentId] ?? { morning: "", afternoon: "" };
                return (
                  <tr key={s.studentId}>
                    <td>
                      <div className="mentor-attendance-student">{s.studentName}</div>
                      <div className="mentor-attendance-code">{s.studentCode}</div>
                    </td>
                    <td>
                      <select
                        className="input-plain attendance-select"
                        value={edit.morning}
                        onChange={(event) => updateEdit(s.studentId, "morning", event.target.value)}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="input-plain attendance-select"
                        value={edit.afternoon}
                        onChange={(event) => updateEdit(s.studentId, "afternoon", event.target.value)}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{s.internshipPlace}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <p className="auth-hint mentor-table-empty">ไม่พบข้อมูลนักศึกษา (กรุณาลองค้นหาใหม่อีกครั้ง)</p>
          )}
        </div>
      </div>
    </div>
  );
}
