import { useEffect, useMemo, useState } from "react";
import { fetchTeacherStudents } from "../api";
import type { TeacherStudent } from "../types";
import { TeacherStudentSupervisionsPage } from "./TeacherStudentSupervisionsPage";
import { formatThaiDate } from "../utils/dateFormat";

interface TeacherSupervisionListPageProps {
  token: string;
}

export function TeacherSupervisionListPage({ token }: TeacherSupervisionListPageProps) {
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTeacherStudents(token)
      .then((res) => {
        if (cancelled) return;
        // Only students this teacher supervises (อาจารย์นิเทศ) — being just
        // the อาจารย์ที่ปรึกษา (advisor) doesn't allow keeping a supervision log.
        setStudents(res.students.filter((s) => s.roles.includes("supervisor")));
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
  }, [token]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.studentCode.toLowerCase().includes(q) || s.studentName.toLowerCase().includes(q)
    );
  }, [students, search]);

  if (loading) {
    return <p>กำลังโหลดข้อมูล...</p>;
  }

  if (loadError) {
    return <p className="form-error">{loadError}</p>;
  }

  if (selectedStudentId !== null) {
    return (
      <TeacherStudentSupervisionsPage
        token={token}
        studentId={selectedStudentId}
        onBack={() => setSelectedStudentId(null)}
      />
    );
  }

  return (
    <div className="report-page">
      <div className="report-card">
        <h2 className="report-title">บันทึกการนิเทศนักศึกษา</h2>
        <p className="auth-hint">เลือกนักศึกษาเพื่อบันทึกหรือดูประวัติการออกนิเทศ</p>

        <div className="mentor-table-toolbar">
          <h3 className="report-history-title">การค้นหารายชื่อหรือรหัสนักศึกษา</h3>
          <input
            className="input-plain mentor-search-input"
            placeholder="รหัสนักศึกษา หรือ ชื่อ-นามสกุล..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="mentor-table-wrap">
          <table className="mentor-table">
            <thead>
              <tr>
                <th>รหัสนักศึกษา</th>
                <th>ชื่อ-นามสกุล</th>
                <th>สาขาวิชา</th>
                <th>สถานที่ฝึกงาน</th>
                <th>ระยะเวลาฝึกงาน</th>
                <th>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => (
                <tr key={s.studentId} className="mentor-table-row" onClick={() => setSelectedStudentId(s.studentId)}>
                  <td>{s.studentCode}</td>
                  <td>{s.studentName}</td>
                  <td>{s.majorName}</td>
                  <td>{s.internshipPlace}</td>
                  <td>
                    {formatThaiDate(s.internshipStart)} – {formatThaiDate(s.internshipEnd)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedStudentId(s.studentId);
                      }}
                    >
                      บันทึกการนิเทศ
                    </button>
                  </td>
                </tr>
              ))}
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
