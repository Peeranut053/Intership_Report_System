import { useEffect, useMemo, useState } from "react";
import { fetchTeacherStudents } from "../api";
import type { TeacherStudent, TeacherStudentsSummary } from "../types";
import { formatThaiDate } from "../utils/dateFormat";

interface TeacherHomePageProps {
  token: string;
}

const ROLE_LABEL: Record<string, string> = {
  advisor: "อาจารย์ที่ปรึกษา",
  supervisor: "อาจารย์นิเทศ",
};

export function TeacherHomePage({ token }: TeacherHomePageProps) {
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [summary, setSummary] = useState<TeacherStudentsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchTeacherStudents(token)
      .then((res) => {
        if (cancelled) return;
        setStudents(res.students);
        setSummary(res.summary);
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

  return (
    <div className="report-page">
      <div className="report-card">
        <h2 className="report-title">หน้าหลัก — นักศึกษาในความดูแล</h2>
        <div className="home-stats-grid">
          <div className="home-stat-box">
            <div className="home-stat-value">{summary?.totalStudents ?? 0}</div>
            <div className="home-stat-label">นักศึกษาในความดูแลทั้งหมด</div>
          </div>
          <div className="home-stat-box">
            <div className="home-stat-value">{summary?.advisorCount ?? 0}</div>
            <div className="home-stat-label">เป็นอาจารย์ที่ปรึกษา</div>
          </div>
          <div className="home-stat-box">
            <div className="home-stat-value">{summary?.supervisorCount ?? 0}</div>
            <div className="home-stat-label">เป็นอาจารย์นิเทศ</div>
          </div>
        </div>
      </div>

      <div className="report-card">
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
                <th>บทบาท</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => (
                <tr key={s.studentId}>
                  <td>{s.studentCode}</td>
                  <td>{s.studentName}</td>
                  <td>{s.majorName}</td>
                  <td>{s.internshipPlace}</td>
                  <td>
                    {formatThaiDate(s.internshipStart)} – {formatThaiDate(s.internshipEnd)}
                  </td>
                  <td>
                    <div className="teacher-role-badges">
                      {s.roles.map((role) => (
                        <span key={role} className={`teacher-role-badge teacher-role-badge--${role}`}>
                          {ROLE_LABEL[role] ?? role}
                        </span>
                      ))}
                    </div>
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
