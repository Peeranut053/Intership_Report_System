import { useEffect, useMemo, useState } from "react";
import { fetchTeacherNotebookEvaluation, saveTeacherNotebookEvaluation } from "../api";
import type { EvaluationQuestion, TeacherNotebookEvaluationData } from "../types";
import { daysBetweenInclusive, formatThaiDate, toDateOnly } from "../utils/dateFormat";

interface TeacherNotebookEvaluationFormPageProps {
  token: string;
  studentId: number;
  onBack: () => void;
}

const SCORE_COLUMNS = [4, 3, 2, 1];

export function TeacherNotebookEvaluationFormPage({
  token,
  studentId,
  onBack,
}: TeacherNotebookEvaluationFormPageProps) {
  const [data, setData] = useState<TeacherNotebookEvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [scores, setScores] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTeacherNotebookEvaluation(token, studentId)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        const initialScores: Record<number, number> = {};
        for (const q of res.questions) {
          if (q.score !== null) initialScores[q.questionId] = q.score;
        }
        setScores(initialScores);
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

  const totalScore = useMemo(() => Object.values(scores).reduce((sum, s) => sum + s, 0), [scores]);

  const totalInternshipDays = useMemo(() => {
    if (!data) return 0;
    return daysBetweenInclusive(
      toDateOnly(data.student.internshipStart),
      toDateOnly(data.student.internshipEnd)
    );
  }, [data]);

  function setScore(questionId: number, value: number) {
    setScores((prev) => ({ ...prev, [questionId]: value }));
    setSaveMessage(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      await saveTeacherNotebookEvaluation(token, studentId, { scores });
      setSaveMessage("บันทึกผลการประเมินเรียบร้อยแล้ว");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "บันทึกผลการประเมินไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="report-page">
      <button type="button" className="link-button mentor-back-link" onClick={onBack}>
        <span aria-hidden="true">←</span> ย้อนกลับ
      </button>

      {loading ? (
        <p>กำลังโหลดข้อมูล...</p>
      ) : loadError || !data ? (
        <p className="form-error">{loadError ?? "ไม่พบข้อมูลนักศึกษา"}</p>
      ) : (
        <>
          <div className="report-card">
            <h2 className="report-title">
              แบบประเมินผลสมุดบันทึกการฝึกประสบการณ์วิชาชีพ คะแนนเต็ม {data.maxScore} คะแนน (สำหรับอาจารย์นิเทศ)
            </h2>
            <div className="report-form">
              <div className="field">
                <span className="field-label">ชื่อ-นามสกุล</span>
                <div className="eval-static-value">{data.student.studentName}</div>
              </div>
              <div className="field">
                <span className="field-label">รหัสประจำตัว</span>
                <div className="eval-static-value">{data.student.studentCode}</div>
              </div>
              <div className="field">
                <span className="field-label">สาขาวิชา</span>
                <div className="eval-static-value">{data.student.majorName}</div>
              </div>
              <div className="field">
                <span className="field-label">ระดับ</span>
                <div className="eval-static-value">
                  ปริญญาตรี 4 ปี ภาคปกติ ชั้นปีที่ {data.student.yearLevel}
                </div>
              </div>
              <div className="field">
                <span className="field-label">ชื่อสถานที่ฝึก</span>
                <div className="eval-static-value">{data.student.internshipPlace}</div>
              </div>
              <div className="field">
                <span className="field-label">ระยะเวลาฝึก</span>
                <div className="eval-static-value">
                  {formatThaiDate(data.student.internshipStart)} – {formatThaiDate(data.student.internshipEnd)}
                </div>
              </div>
              <div className="field">
                <span className="field-label">ภาคการศึกษา</span>
                <div className="eval-static-value">
                  ภาคการศึกษาที่ {data.student.semester} ชั้นปีที่ {data.student.yearLevel}
                </div>
              </div>
            </div>
          </div>

          <div className="report-card">
            <h3 className="report-history-title">สรุปวันลาและเวลาปฏิบัติงาน</h3>
            <div className="home-stats-grid eval-attendance-grid">
              <div className="home-stat-box home-stat-box--warning">
                <div className="home-stat-value">{data.attendanceSummary.sickCount}</div>
                <div className="home-stat-label">ลาป่วย</div>
              </div>
              <div className="home-stat-box home-stat-box--warning">
                <div className="home-stat-value">{data.attendanceSummary.leaveCount}</div>
                <div className="home-stat-label">ลากิจ</div>
              </div>
              <div className="home-stat-box home-stat-box--warning">
                <div className="home-stat-value">{data.attendanceSummary.absentCount}</div>
                <div className="home-stat-label">ขาดการฝึกโดยไม่ทราบสาเหตุ</div>
              </div>
              <div className="home-stat-box">
                <div className="home-stat-value">{totalInternshipDays}</div>
                <div className="home-stat-label">รวมระยะเวลาในการฝึก (วัน)</div>
              </div>
            </div>
          </div>

          <div className="report-card">
            <h3 className="report-history-title">รายละเอียดการประเมิน</h3>
            <div className="eval-table-wrap">
              <table className="eval-table">
                <thead>
                  <tr>
                    <th className="eval-table-topic">หัวข้อการประเมิน</th>
                    {SCORE_COLUMNS.map((n) => (
                      <th key={n}>{n}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.questions.map((q: EvaluationQuestion) => (
                    <tr key={q.questionId}>
                      <td className="eval-table-topic">
                        {q.questionNo}. {q.question}
                      </td>
                      {SCORE_COLUMNS.map((n) => (
                        <td key={n} className="eval-table-radio-cell">
                          <input
                            type="radio"
                            name={`question-${q.questionId}`}
                            checked={scores[q.questionId] === n}
                            onChange={() => setScore(q.questionId, n)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="eval-table-topic eval-total-label">รวมคะแนนที่ได้</td>
                    <td colSpan={4} className="eval-total-value">
                      {totalScore} / {data.maxScore}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {saveMessage && <p className="form-success">{saveMessage}</p>}
            {saveError && <p className="form-error">{saveError}</p>}

            <div className="report-form-actions" style={{ marginTop: 18 }}>
              <button type="button" className="btn-secondary" onClick={onBack}>
                ยกเลิก
              </button>
              <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "กำลังบันทึก..." : "บันทึกผลการประเมิน"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
