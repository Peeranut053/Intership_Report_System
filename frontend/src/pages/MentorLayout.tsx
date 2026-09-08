import type { ReactNode } from "react";

export type MentorSection = "home" | "attendance" | "evaluation";

interface NavItem {
  key: MentorSection;
  label: string;
}

interface MentorLayoutProps {
  active: MentorSection;
  onNavigate: (section: MentorSection) => void;
  onLogout: () => void;
  children: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "หน้าหลัก" },
  { key: "attendance", label: "เช็คชื่อนักศึกษา" },
  { key: "evaluation", label: "ประเมินผลนักศึกษา" },
];

export function MentorLayout({ active, onNavigate, onLogout, children }: MentorLayoutProps) {
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
