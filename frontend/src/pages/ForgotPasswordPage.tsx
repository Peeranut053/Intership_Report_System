import { useState } from "react";
import type { FormEvent } from "react";
import { forgotPassword } from "../api";

interface ForgotPasswordPageProps {
  onSwitchToLogin: () => void;
}

export function ForgotPasswordPage({ onSwitchToLogin }: ForgotPasswordPageProps) {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await forgotPassword(identifier);
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ส่งคำขอไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <h2 className="auth-title">ลืมรหัสผ่าน</h2>
      <p className="auth-hint" style={{ marginBottom: 16 }}>
        กรอกอีเมลหรือชื่อผู้ใช้งานของคุณ ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้ทางอีเมล
      </p>

      {message ? (
        <>
          <p className="form-error" style={{ color: "#1e7a4c" }}>
            {message}
          </p>
          <p className="switch-link">
            <button type="button" className="link-button" onClick={onSwitchToLogin}>
              กลับไปหน้าเข้าสู่ระบบ
            </button>
          </p>
        </>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="form">
            <input
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="อีเมลหรือชื่อผู้ใช้งาน"
              autoComplete="username"
              className="input-plain"
              required
            />
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "กำลังส่ง..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
            </button>
          </form>
          <p className="switch-link">
            <button type="button" className="link-button" onClick={onSwitchToLogin}>
              กลับไปหน้าเข้าสู่ระบบ
            </button>
          </p>
        </>
      )}
    </div>
  );
}
