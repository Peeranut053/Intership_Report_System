import { useCallback, useEffect, useState } from "react";
import { fetchMe, login as loginRequest, registerStudent as registerRequest } from "../api";
import { ROLE_LABEL_TH } from "../constants";
import type { AuthUser, RegisterPayload, Role } from "../types";

const TOKEN_STORAGE_KEY = "internship_system_token";

// sessionStorage (not localStorage) is deliberate: it's scoped per browser
// tab instead of shared across every tab on this origin. With localStorage,
// logging in as a mentor in one tab overwrites the same token another tab
// was using as a student — that tab then silently turns into the mentor's
// session on its next read (e.g. a refresh). Per-tab storage lets a student
// tab and a mentor tab stay logged in side by side. Trade-off: a session no
// longer survives opening a fresh tab to the same URL (a duplicated tab
// still carries it over) — each tab needs its own login, which is the
// correct behavior for testing multiple roles at once.
const storage = window.sessionStorage;

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => storage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);
  // Starts true whenever a stored token exists, so the UI doesn't flash the
  // login form before we've confirmed the token is still valid.
  const [loading, setLoading] = useState<boolean>(() => !!storage.getItem(TOKEN_STORAGE_KEY));

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchMe(token)
      .then((res) => {
        if (!cancelled) setUser(res.user);
      })
      .catch(() => {
        // Token expired/invalid — drop it and fall back to the login screen.
        if (!cancelled) {
          storage.removeItem(TOKEN_STORAGE_KEY);
          setToken(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (identifier: string, password: string, expectedRole?: Role) => {
    const res = await loginRequest(identifier, password);

    // The login form has role tabs (student/teacher/mentor); if the account
    // that actually matched belongs to a different role, treat it as a
    // login failure rather than silently dropping the user into the wrong
    // dashboard.
    if (expectedRole && res.user.role !== expectedRole) {
      throw new Error(
        `บัญชีนี้เป็นบัญชี${ROLE_LABEL_TH[res.user.role]} ไม่ใช่${ROLE_LABEL_TH[expectedRole]} กรุณาเลือกประเภทผู้ใช้ให้ถูกต้อง`
      );
    }

    storage.setItem(TOKEN_STORAGE_KEY, res.token);
    setUser(res.user);
    setToken(res.token);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await registerRequest(payload);
    storage.setItem(TOKEN_STORAGE_KEY, res.token);
    setUser(res.user);
    setToken(res.token);
  }, []);

  const logout = useCallback(() => {
    storage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return { user, token, loading, login, register, logout };
}
