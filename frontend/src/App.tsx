import { useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./hooks/useAuth";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { StudentLayout } from "./pages/StudentLayout";
import type { StudentSection } from "./pages/StudentLayout";
import { DailyReportsPage } from "./pages/DailyReportsPage";
import { StudentProfilePage } from "./pages/StudentProfilePage";
import { StudentHomePage } from "./pages/StudentHomePage";
import { StudentDocumentsPage } from "./pages/StudentDocumentsPage";
import { MentorLayout } from "./pages/MentorLayout";
import type { MentorSection } from "./pages/MentorLayout";
import { MentorHomePage } from "./pages/MentorHomePage";
import { MentorAttendancePage } from "./pages/MentorAttendancePage";
import { MentorEvaluationListPage } from "./pages/MentorEvaluationListPage";
import { TeacherLayout } from "./pages/TeacherLayout";
import type { TeacherSection } from "./pages/TeacherLayout";
import { TeacherHomePage } from "./pages/TeacherHomePage";
import { TeacherSupervisionListPage } from "./pages/TeacherSupervisionListPage";
import { TeacherNotebookEvaluationListPage } from "./pages/TeacherNotebookEvaluationListPage";

type View = "login" | "register" | "forgot-password";

// No router library is installed, so a password-reset link
// (".../?token=...") is read directly from the URL on first load instead of
// through route params. Whatever page it points at, a reset token in the
// URL always takes priority over the normal login/register view.
function getResetTokenFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("token");
}

function App() {
  const { user, token, loading, login, register, logout } = useAuth();
  const [view, setView] = useState<View>("login");
  const [resetToken, setResetToken] = useState<string | null>(() => getResetTokenFromUrl());
  const [studentSection, setStudentSection] = useState<StudentSection>("home");
  const [mentorSection, setMentorSection] = useState<MentorSection>("home");
  const [teacherSection, setTeacherSection] = useState<TeacherSection>("home");

  function clearResetToken() {
    setResetToken(null);
    // Drop ?token=... from the address bar so the link can't be reused
    // (accidentally re-opened from history/bookmarks) after it's been used.
    window.history.replaceState({}, "", window.location.pathname);
  }

  let content: ReactNode;

  if (resetToken) {
    content = (
      <div className="page">
        <main className="page-main">
          <ResetPasswordPage token={resetToken} onDone={clearResetToken} />
        </main>
      </div>
    );
  } else if (loading) {
    content = (
      <div className="page">
        <main className="page-main">
          <p>กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</p>
        </main>
      </div>
    );
  } else if (user && user.role === "student" && token) {
    // Student sidebar shell. "submission" is still a placeholder —
    // home/profile/reports/documents are built.
    content = (
      <StudentLayout active={studentSection} onNavigate={setStudentSection} onLogout={logout}>
        {studentSection === "home" ? (
          <StudentHomePage token={token} onNavigate={setStudentSection} />
        ) : studentSection === "reports" ? (
          <DailyReportsPage token={token} />
        ) : studentSection === "profile" ? (
          <StudentProfilePage token={token} />
        ) : studentSection === "documents" ? (
          <StudentDocumentsPage token={token} />
        ) : (
          <div className="report-card">
            <p className="auth-hint">ส่วนนี้ยังไม่เปิดให้ใช้งาน</p>
          </div>
        )}
      </StudentLayout>
    );
  } else if (user && user.role === "mentor" && token) {
    // Mentor sidebar shell. "attendance" and "evaluation" are still
    // placeholders — home (student roster) is built.
    content = (
      <MentorLayout active={mentorSection} onNavigate={setMentorSection} onLogout={logout}>
        {mentorSection === "home" ? (
          <MentorHomePage token={token} />
        ) : mentorSection === "attendance" ? (
          <MentorAttendancePage token={token} />
        ) : mentorSection === "evaluation" ? (
          <MentorEvaluationListPage token={token} />
        ) : (
          <div className="report-card">
            <p className="auth-hint">ส่วนนี้ยังไม่เปิดให้ใช้งาน</p>
          </div>
        )}
      </MentorLayout>
    );
  } else if (user && user.role === "teacher" && token) {
    // Teacher sidebar shell. "supervision" and "evaluation" are still
    // placeholders — home (advisee/supervisee roster) is built.
    content = (
      <TeacherLayout active={teacherSection} onNavigate={setTeacherSection} onLogout={logout} teacherName={user.name}>
        {teacherSection === "home" ? (
          <TeacherHomePage token={token} />
        ) : teacherSection === "supervision" ? (
          <TeacherSupervisionListPage token={token} />
        ) : teacherSection === "evaluation" ? (
          <TeacherNotebookEvaluationListPage token={token} />
        ) : (
          <div className="report-card">
            <p className="auth-hint">ส่วนนี้ยังไม่เปิดให้ใช้งาน</p>
          </div>
        )}
      </TeacherLayout>
    );
  } else if (user) {
    content = (
      <div className="page">
        <main className="page-main">
          <DashboardPage user={user} onLogout={logout} />
        </main>
      </div>
    );
  } else {
    content = (
      <div className="page">
        <main className="page-main">
          {view === "login" ? (
            <LoginPage
              onLogin={login}
              onSwitchToRegister={() => setView("register")}
              onSwitchToForgotPassword={() => setView("forgot-password")}
            />
          ) : view === "register" ? (
            <RegisterPage onRegister={register} onSwitchToLogin={() => setView("login")} />
          ) : (
            <ForgotPasswordPage onSwitchToLogin={() => setView("login")} />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="app-root">
      <header className="app-topbar">ระบบรายงานผลการฝึกประสบการณ์วิชาชีพ</header>
      <div className="app-body">{content}</div>
    </div>
  );
}

export default App;
