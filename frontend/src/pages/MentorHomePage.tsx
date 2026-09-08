import { useEffect, useMemo, useState } from "react";
import { fetchMentorStudents } from "../api";
import type { MentorStudent, MentorStudentsSummary } from "../types";
import { MentorStudentReportsPage } from "./MentorStudentReportsPage";
import { formatThaiDate } from "../utils/dateFormat";

interface MentorHomePageProps {
  token: string;
}

export function MentorHomePage({ token }: MentorHomePageProps) {
  const [students, setStudents] = useState<MentorStudent[]>([]);
  const [summary, setSummary] = useState<MentorStudentsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMentorStudents(token)
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

  if (selectedStudentId !== null) {
    return (
      <MentorStudentReportsPage
        token={token}
        studentId={selectedStudentId}
        onBack={() => setSelectedStudentId(null)}
      />
    );
  }

  return (
    <div className="report-page">
      <div className="report-card">
        <h2 className="report-title">หน้าหลัก — นักศึกษาในความดูแล</h2>
        <div className="home-stats-grid">
          <div className="home-stat-box">
            <div className="home-stat-value">{summary?.totalStudents ?? 0}</div>
            <div className="home-stat-label">นักศึกษาในความดูแล</div>
          </div>
          <div className="home-stat-box home-stat-box--warning">
            <div className="home-stat-value">{summary?.notYetReportingCount ?? 0}</div>
            <div className="home-stat-label">ยังไม่มีรายงานเลย</div>
          </div>
          <div className="home-stat-box">
            <div className="home-stat-value">{summary?.submittedCount ?? 0}</div>
            <div className="home-stat-label">ส่งเล่มรายงานแล้ว</div>
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
                      ตรวจรายงาน
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
