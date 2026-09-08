import { useState } from "react";
import type { FormEvent } from "react";
import { resetPassword } from "../api";

interface ResetPasswordPageProps {
  token: string;
  onDone: () => void;
}

export function ResetPasswordPage({ token, onDone }: ResetPasswordPageProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }

    setSubmitting(true);
    try {
      const res = await resetPassword(token, newPassword);
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ตั้งรหัสผ่านใหม่ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <h2 className="auth-title">ตั้งรหัสผ่านใหม่</h2>

      {message ? (
        <>
          <p className="form-error" style={{ color: "#1e7a4c" }}>
            {message}
          </p>
          <p className="switch-link">
            <button type="button" className="link-button" onClick={onDone}>
              ไปหน้าเข้าสู่ระบบ
            </button>
          </p>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="form">
          <input
            type="password"
            value={newPassword}
            minLength={8}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)"
            autoComplete="new-password"
            className="input-plain"
            required
          />
          <input
            type="password"
            value={confirmPassword}
            minLength={8}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="ยืนยันรหัสผ่านใหม่"
            autoComplete="new-password"
            className="input-plain"
            required
          />
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
          </button>
        </form>
      )}
    </div>
  );
}
