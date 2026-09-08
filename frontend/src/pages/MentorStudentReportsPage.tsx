import { useEffect, useState } from "react";
import { fetchMentorStudentReports, setMentorReportChecked } from "../api";
import type { MentorReportRow, MentorStudentHeader } from "../types";
import { formatThaiDate, formatThaiDateTime } from "../utils/dateFormat";

interface MentorStudentReportsPageProps {
  token: string;
  studentId: number;
  onBack: () => void;
}

export function MentorStudentReportsPage({ token, studentId, onBack }: MentorStudentReportsPageProps) {
  const [student, setStudent] = useState<MentorStudentHeader | null>(null);
  const [reports, setReports] = useState<MentorReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [openReportId, setOpenReportId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMentorStudentReports(token, studentId)
      .then((res) => {
        if (cancelled) return;
        setStudent(res.student);
        setReports(res.reports);
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
  }, [token, studentId]);

  async function toggleChecked(report: MentorReportRow) {
    const nextChecked = !report.checked;
    setPendingId(report.report_id);
    try {
      const res = await setMentorReportChecked(token, report.report_id, nextChecked);
      setReports((prev) =>
        prev.map((r) =>
          r.report_id === report.report_id ? { ...r, checked: res.checked, checked_at: res.checkedAt } : r
        )
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "บันทึกการตรวจไม่สำเร็จ");
    } finally {
      setPendingId(null);
    }
  }

  const checkedCount = reports.filter((r) => r.checked).length;
  const openReport = reports.find((r) => r.report_id === openReportId) ?? null;

  return (
    <div className="report-page mentor-detail-page">
      <button type="button" className="link-button mentor-back-link" onClick={onBack}>
        <span aria-hidden="true">←</span> ย้อนกลับ
      </button>

      {loading ? (
        <p>กำลังโหลดข้อมูล...</p>
      ) : loadError || !student ? (
        <p className="form-error">{loadError ?? "ไม่พบข้อมูลนักศึกษา"}</p>
      ) : (
        <>
          <div className="report-card">
            <h2 className="report-title">ตรวจรายงานประจำวัน — {student.studentName}</h2>
            <div className="profile-grid">
              <div>
                <span className="profile-label">รหัสนักศึกษา:</span> {student.studentCode}
              </div>
              <div>
                <span className="profile-label">สถานที่ฝึกงาน:</span> {student.internshipPlace}
              </div>
              <div>
                <span className="profile-label">ตรวจแล้ว:</span> {checkedCount} จาก {reports.length} ฉบับ
              </div>
            </div>
          </div>

          <div className="report-card">
            <h3 className="report-history-title">ประวัติการบันทึกรายงาน</h3>
            {reports.length === 0 ? (
              <p className="auth-hint">นักศึกษาคนนี้ยังไม่ได้บันทึกรายงานเลย</p>
            ) : (
              <ul className="report-history-list">
                {reports.map((report) => (
                  <li
                    key={report.report_id}
                    className="report-history-item mentor-table-row"
                    onClick={() => setOpenReportId(report.report_id)}
                  >
                    <div>
                      <div className="report-history-date">
                        {formatThaiDate(report.report_date)}
                        {report.checked ? (
                          <span className="report-check-badge report-check-badge--checked">ตรวจแล้ว</span>
                        ) : (
                          <span className="report-check-badge report-check-badge--pending">รอตรวจ</span>
                        )}
                      </div>
                      <p className="mentor-report-desc mentor-report-desc--clamped">{report.work_description}</p>
                      <div className="report-history-meta">
                        {report.company_location && <span>สถานที่: {report.company_location}</span>}
                        {report.work_place && <span>แผนก: {report.work_place}</span>}
                        {report.supervisor_name && <span>ผู้ควบคุม: {report.supervisor_name}</span>}
                      </div>
                      {report.checked && report.checked_at && (
                        <div className="report-history-updated">
                          ตรวจแล้วเมื่อ: {formatThaiDateTime(report.checked_at)}
                        </div>
                      )}
                    </div>
                    <div className="report-history-actions mentor-report-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenReportId(report.report_id);
                        }}
                      >
                        ดูรายงาน
                      </button>
                      <button
                        type="button"
                        className={report.checked ? "btn-secondary" : "btn-primary"}
                        disabled={pendingId === report.report_id}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleChecked(report);
                        }}
                      >
                        {pendingId === report.report_id
                          ? "กำลังบันทึก..."
                          : report.checked
                          ? "ยกเลิกการตรวจ"
                          : "ตรวจแล้ว"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {openReport && (
        <div className="modal-overlay" onClick={() => setOpenReportId(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3 className="report-history-title">รายงานวันที่ {formatThaiDate(openReport.report_date)}</h3>
              <button
                type="button"
                className="icon-button icon-button--text modal-close"
                onClick={() => setOpenReportId(null)}
              >
                ปิด
              </button>
            </div>

            <div className="modal-body">
              <p className="field-label">เนื้อหา/ลักษณะงาน/การปฏิบัติ</p>
              <p className="mentor-report-desc-full">{openReport.work_description}</p>

              <div className="profile-grid modal-meta-grid">
                <div>
                  <span className="profile-label">ที่ตั้งสถานประกอบการ:</span> {openReport.company_location || "-"}
                </div>
                <div>
                  <span className="profile-label">สถานที่ฝึก:</span> {openReport.work_place || "-"}
                </div>
                <div>
                  <span className="profile-label">ผู้ควบคุมการฝึก:</span> {openReport.supervisor_name || "-"}
                </div>
                <div>
                  <span className="profile-label">บันทึกเมื่อ:</span> {formatThaiDateTime(openReport.created_at)}
                </div>
                <div>
                  <span className="profile-label">แก้ไขล่าสุด:</span> {formatThaiDateTime(openReport.updated_at)}
                </div>
                {openReport.checked && openReport.checked_at && (
                  <div>
                    <span className="profile-label">ตรวจแล้วเมื่อ:</span> {formatThaiDateTime(openReport.checked_at)}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className={openReport.checked ? "btn-secondary" : "btn-primary"}
                disabled={pendingId === openReport.report_id}
                onClick={() => toggleChecked(openReport)}
              >
                {pendingId === openReport.report_id
                  ? "กำลังบันทึก..."
                  : openReport.checked
                  ? "ยกเลิกการตรวจ"
                  : "ตรวจแล้ว"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
