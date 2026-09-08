import { useEffect, useState } from "react";
import { fetchMyReports, fetchStudentProfile } from "../api";
import type { DailyReport, StudentProfile } from "../types";
import type { StudentSection } from "./StudentLayout";
import { daysBetweenInclusive, formatThaiDate, toDateOnly } from "../utils/dateFormat";

interface StudentHomePageProps {
  token: string;
  onNavigate: (section: StudentSection) => void;
}

function toIsoDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Weekday (Mon-Fri) dates from `start` to `end`, inclusive — used as the
// "expected report days" baseline, since ฝึกงาน/สหกิจศึกษา is normally
// Mon-Fri. Returns [] if start is after end.
function listWeekdaysBetween(start: Date, end: Date): string[] {
  const result: string[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) result.push(toIsoDay(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export function StudentHomePage({ token, onNavigate }: StudentHomePageProps) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchStudentProfile(token), fetchMyReports(token)])
      .then(([profileRes, reportsRes]) => {
        if (cancelled) return;
        setProfile(profileRes.profile);
        setReports(reportsRes.reports);
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

  if (loading) {
    return <p>กำลังโหลดข้อมูล...</p>;
  }

  if (loadError || !profile) {
    return <p className="form-error">{loadError ?? "ไม่พบข้อมูลนักศึกษา"}</p>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = toDateOnly(profile.internshipStart);
  const end = toDateOnly(profile.internshipEnd);
  const totalDays = Math.max(daysBetweenInclusive(start, end), 1);

  let status: "not-started" | "in-progress" | "finished";
  let elapsedDays: number;
  if (today.getTime() < start.getTime()) {
    status = "not-started";
    elapsedDays = 0;
  } else if (today.getTime() > end.getTime()) {
    status = "finished";
    elapsedDays = totalDays;
  } else {
    status = "in-progress";
    elapsedDays = daysBetweenInclusive(start, today);
  }
  const remainingDays = Math.max(totalDays - elapsedDays, 0);
  const progressPct = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

  const expectedEnd = today.getTime() < start.getTime() ? start : today.getTime() > end.getTime() ? end : today;
  const expectedDates = status === "not-started" ? [] : listWeekdaysBetween(start, expectedEnd);
  const submittedDates = new Set(reports.map((r) => r.report_date.slice(0, 10)));
  const submittedExpectedCount = expectedDates.filter((d) => submittedDates.has(d)).length;
  const missingDates = expectedDates.filter((d) => !submittedDates.has(d)).reverse();

  const statusLabel =
    status === "not-started" ? "ยังไม่เริ่มฝึกงาน" : status === "finished" ? "ฝึกงานครบกำหนดแล้ว" : "กำลังฝึกงาน";

  return (
    <div className="report-page">
      <div className="report-card">
        <h2 className="report-title">สวัสดี {profile.studentName}</h2>
        <div className="profile-grid">
          <div>
            <span className="profile-label">รหัสนักศึกษา:</span> {profile.studentCode}
            &nbsp;&nbsp;
            <span className="profile-label">สาขาวิชา:</span> {profile.majorName}
          </div>
          <div>
            <span className="profile-label">สถานที่ฝึกงาน:</span> {profile.internshipPlace}
          </div>
          <div>
            <span className="profile-label">พี่เลี้ยง:</span> {profile.mentorName ?? "-"}
            &nbsp;&nbsp;
            <span className="profile-label">อาจารย์ที่ปรึกษา:</span> {profile.advisorTeacherName ?? "-"}
          </div>
          <div>
            <span className="profile-label">ระยะเวลาฝึกงาน:</span> {formatThaiDate(profile.internshipStart)} –{" "}
            {formatThaiDate(profile.internshipEnd)}
          </div>
        </div>
      </div>

      <div className="report-card">
        <h3 className="report-history-title">ความคืบหน้าการฝึกงาน — {statusLabel}</h3>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="progress-bar-caption">
          {status === "finished"
            ? `ฝึกงานครบ ${totalDays} วันแล้ว`
            : `ผ่านมาแล้ว ${elapsedDays} จาก ${totalDays} วัน (เหลืออีก ${remainingDays} วัน)`}
        </p>

        <div className="home-stats-grid">
          <div className="home-stat-box">
            <div className="home-stat-value">{reports.length}</div>
            <div className="home-stat-label">รายงานที่บันทึกทั้งหมด</div>
          </div>
          <div className="home-stat-box">
            <div className="home-stat-value">{submittedExpectedCount}</div>
            <div className="home-stat-label">วันทำงานที่บันทึกแล้ว (จาก {expectedDates.length} วัน)</div>
          </div>
          <div className="home-stat-box home-stat-box--warning">
            <div className="home-stat-value">{missingDates.length}</div>
            <div className="home-stat-label">วันทำงานที่ยังไม่ได้บันทึก</div>
          </div>
        </div>

        {missingDates.length > 0 && (
          <div className="home-missing-list">
            <p className="field-label">วันที่ยังไม่ได้บันทึกรายงาน (ล่าสุดก่อน):</p>
            <div className="home-missing-tags">
              {missingDates.slice(0, 8).map((d) => (
                <span key={d} className="home-missing-tag">
                  {formatThaiDate(d)}
                </span>
              ))}
              {missingDates.length > 8 && <span className="home-missing-tag">+{missingDates.length - 8} วัน</span>}
            </div>
          </div>
        )}

        <div className="report-form-actions" style={{ marginTop: 18 }}>
          <button type="button" className="btn-primary" onClick={() => onNavigate("reports")}>
            ไปหน้าบันทึกรายงาน
          </button>
        </div>
      </div>
    </div>
  );
}
