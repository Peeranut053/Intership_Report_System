import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { fetchMajors, fetchMentors, fetchTeachers } from "../api";
import type { Major, Mentor, RegisterPayload, Teacher } from "../types";

interface RegisterPageProps {
  onRegister: (payload: RegisterPayload) => Promise<void>;
  onSwitchToLogin: () => void;
}

const EMPTY_FORM = {
  name: "",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  studentCode: "",
  majorId: "",
  internshipPlace: "",
  internshipStart: "",
  internshipEnd: "",
  mentorId: "",
  advisorTeacherId: "",
  supervisorTeacherId1: "",
  supervisorTeacherId2: "",
};

type FormState = typeof EMPTY_FORM;

export function RegisterPage({ onRegister, onSwitchToLogin }: RegisterPageProps) {
  const [majors, setMajors] = useState<Major[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchMajors(), fetchTeachers(), fetchMentors()])
      .then(([majorsRes, teachersRes, mentorsRes]) => {
        if (cancelled) return;
        setMajors(majorsRes.majors);
        setTeachers(teachersRes.teachers);
        setMentors(mentorsRes.mentors);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (form.supervisorTeacherId1 && form.supervisorTeacherId1 === form.supervisorTeacherId2) {
      setError("อาจารย์นิเทศ 2 คนต้องไม่ใช่คนเดียวกัน");
      return;
    }

    setSubmitting(true);
    try {
      await onRegister({
        name: form.name,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        studentCode: form.studentCode,
        majorId: Number(form.majorId),
        internshipPlace: form.internshipPlace,
        internshipStart: form.internshipStart,
        internshipEnd: form.internshipEnd,
        mentorId: Number(form.mentorId),
        advisorTeacherId: Number(form.advisorTeacherId),
        supervisorTeacherIds: [Number(form.supervisorTeacherId1), Number(form.supervisorTeacherId2)],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "สมัครสมาชิกไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingOptions) {
    return (
      <div className="auth-shell auth-shell--wide">
        <p>กำลังโหลดข้อมูลสาขา/อาจารย์/พี่เลี้ยง...</p>
      </div>
    );
  }

  if (loadError || majors.length === 0 || teachers.length < 2 || mentors.length === 0) {
    return (
      <div className="auth-shell auth-shell--wide">
        <h2 className="auth-title">ยังสมัครไม่ได้</h2>
        {loadError && <p className="form-error">{loadError}</p>}
        <p className="auth-hint">
          ฟอร์มนี้ต้องมีข้อมูลสาขาวิชาอย่างน้อย 1 รายการ อาจารย์อย่างน้อย 2 คน (สำหรับอาจารย์ที่ปรึกษาและอาจารย์นิเทศ)
          และพี่เลี้ยงอย่างน้อย 1 คนอยู่ในระบบก่อน — ให้ผู้ดูแลระบบสร้างบัญชีเหล่านี้ก่อน แล้วรีเฟรชหน้านี้ใหม่
        </p>
        <p className="switch-link">
          <button type="button" className="link-button" onClick={onSwitchToLogin}>
            กลับไปหน้าเข้าสู่ระบบ
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="auth-shell auth-shell--wide">
      <h2 className="auth-title">สมัครสมาชิก (นักศึกษาฝึกงาน)</h2>

      <form onSubmit={handleSubmit} className="form form--grid">
        <label className="field">
          <span className="field-label">ชื่อผู้ใช้ / Username</span>
          <input
            className="input-plain"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">ชื่อ</span>
          <input
            className="input-plain"
            value={form.firstName}
            onChange={(event) => updateField("firstName", event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">นามสกุล</span>
          <input
            className="input-plain"
            value={form.lastName}
            onChange={(event) => updateField("lastName", event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">อีเมล</span>
          <input
            className="input-plain"
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)</span>
          <input
            className="input-plain"
            type="password"
            minLength={8}
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">รหัสนักศึกษา (ตัวเลข 12 หลัก)</span>
          <input
            className="input-plain"
            value={form.studentCode}
            onChange={(event) => updateField("studentCode", event.target.value)}
            pattern="[0-9]{12}"
            title="ตัวเลข 12 หลัก"
            required
          />
        </label>

        <label className="field">
          <span className="field-label">สาขาวิชา</span>
          <select
            className="input-plain"
            value={form.majorId}
            onChange={(event) => updateField("majorId", event.target.value)}
            required
          >
            <option value="" disabled>
              เลือกสาขาวิชา
            </option>
            {majors.map((major) => (
              <option key={major.major_id} value={major.major_id}>
                {major.major_name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">สถานที่ฝึกงาน</span>
          <input
            className="input-plain"
            value={form.internshipPlace}
            onChange={(event) => updateField("internshipPlace", event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">วันเริ่มฝึกงาน</span>
          <input
            className="input-plain"
            type="date"
            value={form.internshipStart}
            onChange={(event) => updateField("internshipStart", event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">วันสิ้นสุดฝึกงาน</span>
          <input
            className="input-plain"
            type="date"
            value={form.internshipEnd}
            onChange={(event) => updateField("internshipEnd", event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">พี่เลี้ยง (Mentor)</span>
          <select
            className="input-plain"
            value={form.mentorId}
            onChange={(event) => updateField("mentorId", event.target.value)}
            required
          >
            <option value="" disabled>
              เลือกพี่เลี้ยง
            </option>
            {mentors.map((mentor) => (
              <option key={mentor.mentor_id} value={mentor.mentor_id}>
                {mentor.mentor_name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">อาจารย์ที่ปรึกษา</span>
          <select
            className="input-plain"
            value={form.advisorTeacherId}
            onChange={(event) => updateField("advisorTeacherId", event.target.value)}
            required
          >
            <option value="" disabled>
              เลือกอาจารย์ที่ปรึกษา
            </option>
            {teachers.map((teacher) => (
              <option key={teacher.teacher_id} value={teacher.teacher_id}>
                {teacher.teacher_name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">อาจารย์นิเทศ คนที่ 1</span>
          <select
            className="input-plain"
            value={form.supervisorTeacherId1}
            onChange={(event) => updateField("supervisorTeacherId1", event.target.value)}
            required
          >
            <option value="" disabled>
              เลือกอาจารย์นิเทศ
            </option>
            {teachers.map((teacher) => (
              <option key={teacher.teacher_id} value={teacher.teacher_id}>
                {teacher.teacher_name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">อาจารย์นิเทศ คนที่ 2</span>
          <select
            className="input-plain"
            value={form.supervisorTeacherId2}
            onChange={(event) => updateField("supervisorTeacherId2", event.target.value)}
            required
          >
            <option value="" disabled>
              เลือกอาจารย์นิเทศ
            </option>
            {teachers.map((teacher) => (
              <option key={teacher.teacher_id} value={teacher.teacher_id}>
                {teacher.teacher_name}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="form-error form-error--span">{error}</p>}

        <button type="submit" className="btn-primary form-span" disabled={submitting}>
          {submitting ? "กำลังสมัคร..." : "สมัครสมาชิก"}
        </button>
      </form>

      <p className="switch-link">
        มีบัญชีอยู่แล้ว?{" "}
        <button type="button" className="link-button" onClick={onSwitchToLogin}>
          เข้าสู่ระบบ
        </button>
      </p>
    </div>
  );
}
