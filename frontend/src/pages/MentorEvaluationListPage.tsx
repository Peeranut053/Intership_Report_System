import { useEffect, useMemo, useState } from "react";
import { fetchMentorStudents } from "../api";
import type { MentorStudent } from "../types";
import { MentorEvaluationFormPage } from "./MentorEvaluationFormPage";

interface MentorEvaluationListPageProps {
  token: string;
}

export function MentorEvaluationListPage({ token }: MentorEvaluationListPageProps) {
  const [students, setStudents] = useState<MentorStudent[]>([]);
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
      <MentorEvaluationFormPage
        token={token}
        studentId={selectedStudentId}
        onBack={() => setSelectedStudentId(null)}
      />
    );
  }

  return (
    <div className="report-page">
      <div className="report-card">
        <div className="mentor-table-toolbar">
          <h2 className="report-title mentor-attendance-title">ประเมินผลนักศึกษา</h2>
          <input
            className="input-plain mentor-search-input"
            placeholder="ค้นหาชื่อหรือรหัสนักศึกษา..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <p className="auth-hint">เลือกนักศึกษาเพื่อกรอกแบบประเมินผลการฝึกประสบการณ์วิชาชีพ (สำหรับสถานฝึกประสบการณ์)</p>

        <div className="mentor-table-wrap">
          <table className="mentor-table">
            <thead>
              <tr>
                <th>รหัสนักศึกษา</th>
                <th>ชื่อ-นามสกุล</th>
                <th>สาขาวิชา</th>
                <th>สถานที่ฝึกงาน</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => (
                <tr key={s.studentId} className="mentor-table-row" onClick={() => setSelectedStudentId(s.studentId)}>
                  <td>{s.studentCode}</td>
                  <td>{s.studentName}</td>
                  <td>{s.majorName}</td>
                  <td>{s.internshipPlace}</td>
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
