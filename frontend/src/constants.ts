import type { Role } from "./types";

export const ROLE_LABEL_TH: Record<Role, string> = {
  student: "นักศึกษา",
  teacher: "อาจารย์",
  mentor: "พี่เลี้ยง",
};

// Display order for the login-page role tabs.
export const LOGIN_ROLE_TABS: Role[] = ["student", "teacher", "mentor"];
