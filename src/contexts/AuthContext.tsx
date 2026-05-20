import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const REMEMBER_KEY = "mundus.rememberMe";
const TAB_MARKER_KEY = "mundus.session-tab";

export function setRememberMe(remember: boolean) {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
    if (remember) sessionStorage.removeItem(TAB_MARKER_KEY);
    else sessionStorage.setItem(TAB_MARKER_KEY, "1");
  } catch {
    /* storage unavailable — ignore */
  }
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Remember-me: if user did NOT check "remember me" on last login and
    // this is a fresh browser tab (sessionStorage marker missing), discard
    // the persisted session before it loads. Reloads inside the same tab
    // keep the marker, so they remain logged in normally.
    let initialPurge: Promise<unknown> = Promise.resolve();
    try {
      const remember = localStorage.getItem(REMEMBER_KEY);
      const sameTab = sessionStorage.getItem(TAB_MARKER_KEY) === "1";
      if (remember === "0" && !sameTab) {
        initialPurge = supabase.auth.signOut({ scope: "local" });
      }
      sessionStorage.setItem(TAB_MARKER_KEY, "1");
    } catch {
      /* ignore */
    }

    let currentUserId: string | null = null;

    const applySession = (newSession: Session | null) => {
      const nextUserId = newSession?.user?.id ?? null;
      setSession(newSession);
      // Only update user when identity changes — avoids re-renders on token refresh
      // that re-trigger downstream fetches (e.g. company lookup).
      if (nextUserId !== currentUserId) {
        currentUserId = nextUserId;
        setUser(newSession?.user ?? null);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      applySession(newSession);
    });

    initialPurge.finally(() => {
      supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
        applySession(currentSession);
        setLoading(false);
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      localStorage.removeItem(REMEMBER_KEY);
      sessionStorage.removeItem(TAB_MARKER_KEY);
    } catch {
      /* ignore */
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}