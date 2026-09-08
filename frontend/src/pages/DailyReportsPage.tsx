import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createReport, deleteReport, fetchMyReports, fetchStudentProfile, updateReport } from "../api";
import type { DailyReport, DailyReportInput, StudentProfile } from "../types";
import { formatThaiDate, formatThaiDateTime, todayIso } from "../utils/dateFormat";

interface DailyReportsPageProps {
  token: string;
}

const EMPTY_INPUT: DailyReportInput = {
  reportDate: todayIso(),
  workDescription: "",
  companyLocation: "",
  workPlace: "",
  supervisorName: "",
};

// Defaults for a NEW report only — prefilled from the student's current
// profile so they don't retype it every day. Each report still stores its
// own independent text (not a join), so editing an existing report always
// shows that report's own saved values via startEdit(), never these live
// profile defaults.
function defaultInput(profile: StudentProfile | null): DailyReportInput {
  return {
    reportDate: todayIso(),
    workDescription: "",
    companyLocation: profile?.internshipPlace ?? "",
    workPlace: "",
    supervisorName: profile?.mentorName ?? "",
  };
}

export function DailyReportsPage({ token }: DailyReportsPageProps) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<DailyReportInput>(EMPTY_INPUT);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchStudentProfile(token), fetchMyReports(token)])
      .then(([profileRes, reportsRes]) => {
        if (cancelled) return;
        setProfile(profileRes.profile);
        setReports(reportsRes.reports);
        setForm(defaultInput(profileRes.profile));
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

  function updateField<K extends keyof DailyReportInput>(key: K, value: DailyReportInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startEdit(report: DailyReport) {
    setEditingId(report.report_id);
    setForm({
      reportDate: report.report_date.slice(0, 10),
      workDescription: report.work_description,
      companyLocation: report.company_location ?? "",
      workPlace: report.work_place ?? "",
      supervisorName: report.supervisor_name ?? "",
    });
    setFormError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(defaultInput(profile));
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      if (editingId) {
        const res = await updateReport(token, editingId, form);
        setReports((prev) => prev.map((r) => (r.report_id === editingId ? res.report : r)));
      } else {
        const res = await createReport(token, form);
        setReports((prev) =>
          [res.report, ...prev].sort((a, b) => (a.report_date < b.report_date ? 1 : -1))
        );
      }
      cancelEdit();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "บันทึกรายงานไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(reportId: number) {
    if (!window.confirm("ลบรายงานนี้?")) return;
    try {
      await deleteReport(token, reportId);
      setReports((prev) => prev.filter((r) => r.report_id !== reportId));
      if (editingId === reportId) cancelEdit();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "ลบรายงานไม่สำเร็จ");
    }
  }

  if (loading) {
    return <p>กำลังโหลดข้อมูล...</p>;
  }

  if (loadError || !profile) {
    return <p className="form-error">{loadError ?? "ไม่พบข้อมูลนักศึกษา"}</p>;
  }

  return (
    <div className="report-page">
      <div className="report-card">
        <h2 className="report-title">บันทึกการปฏิบัติงานในการฝึกประสบการณ์วิชาชีพ (ฝึกงาน)</h2>

        <div className="profile-grid">
          <div>
            <span className="profile-label">ชื่อสถานประกอบการ:</span> {profile.internshipPlace}
          </div>
          <div>
            <span className="profile-label">ชื่อนักศึกษา:</span> {profile.studentName}
          </div>
          <div>
            <span className="profile-label">รหัสนักศึกษา:</span> {profile.studentCode}
            &nbsp;&nbsp;
            <span className="profile-label">สาขาวิชา:</span> {profile.majorName}
          </div>
          <div>
            <span className="profile-label">ระดับ:</span> ปริญญาตรี 4 ปี ภาคปกติ
            &nbsp;&nbsp;
            <span className="profile-label">ชั้นปีที่:</span> {profile.yearLevel}
          </div>
          <div>
            {profile.supervisorTeacherNames.map((name, idx) => (
              <span key={name}>
                <span className="profile-label">อาจารย์นิเทศ {idx + 1}:</span> {name}
                {idx < profile.supervisorTeacherNames.length - 1 ? "  " : ""}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="report-form">
          <label className="field">
            <span className="field-label">วัน/เดือน/ปี</span>
            <input
              className="input-plain"
              type="date"
              value={form.reportDate}
              onChange={(event) => updateField("reportDate", event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="field-label">ที่ตั้งสถานประกอบการ (กรอกเอง)</span>
            <input
              className="input-plain"
              placeholder="เช่น 123 ถ.จิระ..."
              value={form.companyLocation}
              onChange={(event) => updateField("companyLocation", event.target.value)}
            />
          </label>

          <label className="field form-span">
            <span className="field-label">เนื้อหา/ลักษณะงาน/การปฏิบัติ</span>
            <textarea
              className="input-plain textarea-plain"
              placeholder="กรอกรายละเอียดการปฏิบัติงาน..."
              value={form.workDescription}
              onChange={(event) => updateField("workDescription", event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="field-label">สถานที่ฝึก (กรอกเอง)</span>
            <input
              className="input-plain"
              placeholder="เช่น แผนก IT"
              value={form.workPlace}
              onChange={(event) => updateField("workPlace", event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">ผู้ควบคุมการฝึก (กรอกเอง)</span>
            <input
              className="input-plain"
              placeholder="ชื่อผู้ควบคุม..."
              value={form.supervisorName}
              onChange={(event) => updateField("supervisorName", event.target.value)}
            />
          </label>

          {formError && <p className="form-error form-span">{formError}</p>}

          <div className="form-span report-form-actions">
            {editingId && (
              <button type="button" className="btn-secondary" onClick={cancelEdit}>
                ยกเลิกการแก้ไข
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "บันทึกรายงาน"}
            </button>
          </div>
        </form>
      </div>

      <div className="report-card">
        <h3 className="report-history-title">ประวัติการบันทึกรายงาน</h3>
        {reports.length === 0 ? (
          <p className="auth-hint">ยังไม่มีรายงานที่บันทึกไว้</p>
        ) : (
          <ul className="report-history-list">
            {reports.map((report) => (
              <li key={report.report_id} className="report-history-item">
                <div>
                  <div className="report-history-date">
                    {formatThaiDate(report.report_date)}
                    {report.checked ? (
                      <span className="report-check-badge report-check-badge--checked">พี่เลี้ยงตรวจแล้ว</span>
                    ) : (
                      <span className="report-check-badge report-check-badge--pending">รอตรวจ</span>
                    )}
                  </div>
                  <div className="report-history-meta">
                    {report.company_location && <span>สถานที่: {report.company_location}</span>}
                    {report.work_place && <span>แผนก: {report.work_place}</span>}
                    {report.supervisor_name && <span>ผู้ควบคุม: {report.supervisor_name}</span>}
                  </div>
                  <div className="report-history-updated">
                    แก้ไขล่าสุด: {formatThaiDateTime(report.updated_at)}
                    {report.checked && report.checked_at && (
                      <> · ตรวจเมื่อ: {formatThaiDateTime(report.checked_at)}</>
                    )}
                  </div>
                </div>
                <div className="report-history-actions">
                  <button type="button" className="icon-button icon-button--text" onClick={() => startEdit(report)}>
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    className="icon-button icon-button--text"
                    onClick={() => handleDelete(report.report_id)}
                  >
                    ลบ
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
