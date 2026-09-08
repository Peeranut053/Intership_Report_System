import type { ReactNode } from "react";

export type TeacherSection = "home" | "supervision" | "evaluation";

interface NavItem {
  key: TeacherSection;
  label: string;
}

interface TeacherLayoutProps {
  active: TeacherSection;
  onNavigate: (section: TeacherSection) => void;
  onLogout: () => void;
  teacherName: string;
  children: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "หน้าหลัก" },
  { key: "supervision", label: "บันทึกการนิเทศ" },
  { key: "evaluation", label: "ประเมินผลนักศึกษา" },
];

export function TeacherLayout({ active, onNavigate, onLogout, teacherName, children }: TeacherLayoutProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="sidebar-user">
            <span>{teacherName}</span>
          </div>
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
        </div>
        <button type="button" className="sidebar-link sidebar-logout" onClick={onLogout}>
          <span>ออกจากระบบ</span>
        </button>
      </aside>
      <main className="app-content">{children}</main>
    </div>
  );
}
