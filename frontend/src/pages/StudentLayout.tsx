import type { ReactNode } from "react";

export type StudentSection = "home" | "profile" | "documents" | "reports" | "submission";

interface NavItem {
  key: StudentSection;
  label: string;
}

interface StudentLayoutProps {
  active: StudentSection;
  onNavigate: (section: StudentSection) => void;
  onLogout: () => void;
  children: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "หน้าหลัก" },
  { key: "profile", label: "ข้อมูลนักศึกษา" },
  { key: "documents", label: "ดาวน์โหลดเอกสาร" },
  { key: "reports", label: "รายงานการฝึก" },
  { key: "submission", label: "ส่งเล่มโครงงานสหกิจ" },
];

export function StudentLayout({ active, onNavigate, onLogout, children }: StudentLayoutProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`sidebar-link${active === item.key ? " sidebar-link--active" : ""}`}
              onClick={() => onNavigate(item.key)}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button type="button" className="sidebar-link sidebar-logout" onClick={onLogout}>
          <span>ออกจากระบบ</span>
        </button>
      </aside>
      <main className="app-content">{children}</main>
    </div>
  );
}
