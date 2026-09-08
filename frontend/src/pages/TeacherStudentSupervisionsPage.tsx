import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  createTeacherSupervision,
  deleteTeacherSupervision,
  fetchTeacherStudentSupervisions,
  updateTeacherSupervision,
} from "../api";
import type {
  TeacherStudentHeader,
  TeacherSupervision,
  TeacherSupervisionInput,
  TeacherSupervisionTopicInput,
} from "../types";
import { formatThaiDate, todayIso } from "../utils/dateFormat";

interface TeacherStudentSupervisionsPageProps {
  token: string;
  studentId: number;
  onBack: () => void;
}

function emptyTopic(): TeacherSupervisionTopicInput {
  return { topic: "", detail: "" };
}

function emptyInput(): TeacherSupervisionInput {
  return { supervisionDate: todayIso(), topics: [emptyTopic()] };
}

export function TeacherStudentSupervisionsPage({ token, studentId, onBack }: TeacherStudentSupervisionsPageProps) {
  const [student, setStudent] = useState<TeacherStudentHeader | null>(null);
  const [supervisions, setSupervisions] = useState<TeacherSupervision[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<TeacherSupervisionInput>(emptyInput());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTeacherStudentSupervisions(token, studentId)
      .then((res) => {
        if (cancelled) return;
        setStudent(res.student);
        setSupervisions(res.supervisions);
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

  function updateDate(value: string) {
    setForm((prev) => ({ ...prev, supervisionDate: value }));
  }

  function updateTopicField(index: number, key: keyof TeacherSupervisionTopicInput, value: string) {
    setForm((prev) => ({
      ...prev,
      topics: prev.topics.map((t, i) => (i === index ? { ...t, [key]: value } : t)),
    }));
  }

  function addTopicRow() {
    setForm((prev) => ({ ...prev, topics: [...prev.topics, emptyTopic()] }));
  }

  function removeTopicRow(index: number) {
    // No minimum-count guard here — a row can always be removed (e.g. an
    // accidental extra click on "เพิ่มหัวข้อ"). Submitting with zero topics
    // is still caught by handleSubmit's validation before it reaches the API.
    setForm((prev) => ({
      ...prev,
      topics: prev.topics.filter((_, i) => i !== index),
    }));
  }

  function startEdit(item: TeacherSupervision) {
    setEditingId(item.supervision_id);
    setForm({
      supervisionDate: item.supervision_date.slice(0, 10),
      topics:
        item.topics.length > 0
          ? item.topics.map((t) => ({ topic: t.topic, detail: t.detail ?? "" }))
          : [emptyTopic()],
    });
    setFormError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyInput());
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const cleanedTopics = form.topics
      .map((t) => ({ topic: t.topic.trim(), detail: t.detail.trim() }))
      .filter((t) => t.topic !== "");
    if (cleanedTopics.length === 0) {
      setFormError("กรุณากรอกหัวข้ออย่างน้อย 1 หัวข้อ");
      return;
    }

    setSubmitting(true);
    try {
      const input: TeacherSupervisionInput = { supervisionDate: form.supervisionDate, topics: cleanedTopics };
      if (editingId) {
        const res = await updateTeacherSupervision(token, editingId, input);
        setSupervisions((prev) =>
          prev.map((s) => (s.supervision_id === editingId ? res.supervision : s))
        );
      } else {
        const res = await createTeacherSupervision(token, studentId, input);
        setSupervisions((prev) =>
          [res.supervision, ...prev].sort((a, b) => (a.supervision_date < b.supervision_date ? 1 : -1))
        );
      }
      cancelEdit();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(supervisionId: number) {
    if (!window.confirm("ลบบันทึกการนิเทศนี้?")) return;
    try {
      await deleteTeacherSupervision(token, supervisionId);
      setSupervisions((prev) => prev.filter((s) => s.supervision_id !== supervisionId));
      if (editingId === supervisionId) cancelEdit();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "ลบข้อมูลไม่สำเร็จ");
    }
  }

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
            <h2 className="report-title">บันทึกการนิเทศ — {student.studentName}</h2>
            <div className="profile-grid">
              <div>
                <span className="profile-label">รหัสนักศึกษา:</span> {student.studentCode}
              </div>
              <div>
                <span className="profile-label">สถานที่ฝึกงาน:</span> {student.internshipPlace}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="report-form">
              <label className="field">
                <span className="field-label">วันที่นิเทศ</span>
                <input
                  className="input-plain"
                  type="date"
                  value={form.supervisionDate}
                  onChange={(event) => updateDate(event.target.value)}
                  required
                />
              </label>

              <div className="form-span supervision-topics-editor">
                <span className="field-label">หัวข้อการนิเทศ (เพิ่มได้หลายหัวข้อ)</span>
                {form.topics.map((t, index) => (
                  <div key={index} className="supervision-topic-row">
                    <div className="supervision-topic-row-fields">
                      <input
                        className="input-plain"
                        placeholder={`หัวข้อที่ ${index + 1} เช่น ความก้าวหน้าการฝึกงาน`}
                        value={t.topic}
                        onChange={(event) => updateTopicField(index, "topic", event.target.value)}
                      />
                      <textarea
                        className="input-plain textarea-plain"
                        placeholder="รายละเอียด/คำแนะนำสำหรับหัวข้อนี้..."
                        value={t.detail}
                        onChange={(event) => updateTopicField(index, "detail", event.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="icon-button icon-button--text"
                      onClick={() => removeTopicRow(index)}
                    >
                      ลบหัวข้อนี้
                    </button>
                  </div>
                ))}
                {form.topics.length === 0 && (
                  <p className="auth-hint">ยังไม่มีหัวข้อ กด "เพิ่มหัวข้อ" เพื่อเริ่มบันทึก</p>
                )}
                <button type="button" className="btn-secondary" onClick={addTopicRow}>
                  เพิ่มหัวข้อ
                </button>
              </div>

              {formError && <p className="form-error form-span">{formError}</p>}

              <div className="form-span report-form-actions">
                {editingId && (
                  <button type="button" className="btn-secondary" onClick={cancelEdit}>
                    ยกเลิกการแก้ไข
                  </button>
                )}
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "บันทึกการนิเทศ"}
                </button>
              </div>
            </form>
          </div>

          <div className="report-card">
            <h3 className="report-history-title">ประวัติการนิเทศ</h3>
            {supervisions.length === 0 ? (
              <p className="auth-hint">ยังไม่มีการบันทึกการนิเทศสำหรับนักศึกษาคนนี้</p>
            ) : (
              <ul className="report-history-list">
                {supervisions.map((item) => (
                  <li key={item.supervision_id} className="report-history-item">
                    <div>
                      <div className="report-history-date">{formatThaiDate(item.supervision_date)}</div>
                      <ul className="supervision-topic-list">
                        {item.topics.map((t, i) => (
                          <li key={t.topicId ?? i} className="supervision-topic-item">
                            <p className="report-history-topic">{t.topic}</p>
                            {t.detail && <p className="mentor-report-desc">{t.detail}</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="report-history-actions">
                      <button
                        type="button"
                        className="icon-button icon-button--text"
                        onClick={() => startEdit(item)}
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        className="icon-button icon-button--text"
                        onClick={() => handleDelete(item.supervision_id)}
                      >
                        ลบ
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
