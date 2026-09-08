import { ROLE_LABEL_TH } from "../constants";
import type { AuthUser } from "../types";

interface DashboardPageProps {
  user: AuthUser;
  onLogout: () => void;
}

export function DashboardPage({ user, onLogout }: DashboardPageProps) {
  return (
    <div className="auth-shell">
      <h2 className="auth-title">ยินดีต้อนรับ, {user.name}</h2>
      <p>อีเมล: {user.email}</p>
      <p>บทบาท: {ROLE_LABEL_TH[user.role]}</p>
      <button type="button" className="btn-primary" onClick={onLogout}>
        ออกจากระบบ
      </button>
    </div>
  );
}
