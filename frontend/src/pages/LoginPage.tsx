import { useState } from "react";
import type { FormEvent } from "react";
import { ROLE_LABEL_TH, LOGIN_ROLE_TABS } from "../constants";
import type { Role } from "../types";

interface LoginPageProps {
  onLogin: (identifier: string, password: string, expectedRole: Role) => Promise<void>;
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
}

function EyeIcon({ crossedOut }: { crossedOut: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      {crossedOut && <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  );
}

export function LoginPage({ onLogin, onSwitchToRegister, onSwitchToForgotPassword }: LoginPageProps) {
  const [role, setRole] = useState<Role>("student");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onLogin(identifier, password, role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <h2 className="auth-title">
        ระบบรายงานผลการฝึกประสบการณ์วิชาชีพ
        <br />
        มหาวิทยาลัยราชภัฏบุรีรัมย์
      </h2>

      <div className="role-tabs" role="tablist" aria-label="ประเภทผู้ใช้งาน">
        {LOGIN_ROLE_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={role === tab}
            className={`role-tab${role === tab ? " role-tab--active" : ""}`}
            onClick={() => setRole(tab)}
          >
            {ROLE_LABEL_TH[tab]}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="form">
        <input
          type="text"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="ชื่อผู้ใช้งาน"
          autoComplete="username"
          className="input-plain"
          required
        />

        <div className="input-with-icon">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="รหัสผ่าน"
            autoComplete="current-password"
            className="input-plain"
            required
          />
          <button
            type="button"
            className="icon-button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          >
            <EyeIcon crossedOut={!showPassword} />
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}

        <p className="forgot-link">
          <button type="button" className="link-button" onClick={onSwitchToForgotPassword}>
            ลืมรหัสผ่าน?
          </button>
        </p>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>

      <p className="switch-link">
        <button type="button" className="link-button" onClick={onSwitchToRegister}>
          สมัครสมาชิก
        </button>
      </p>
    </div>
  );
}
