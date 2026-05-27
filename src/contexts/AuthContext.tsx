import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  getPersistedValue,
  migrateSupabaseSessionFromWebStorage,
  removePersistedValue,
  setPersistedValue,
} from "@/lib/authStorage";

const REMEMBER_KEY = "mundus.rememberMe";
const TAB_MARKER_KEY = "mundus.session-tab";

export async function setRememberMe(remember: boolean) {
  try {
    await setPersistedValue(REMEMBER_KEY, remember ? "1" : "0");
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
    let cancelled = false;
    let currentUserId: string | null = null;

    const applySession = (newSession: Session | null) => {
      if (cancelled) return;
      const nextUserId = newSession?.user?.id ?? null;
      setSession(newSession);
      if (nextUserId !== currentUserId) {
        currentUserId = nextUserId;
        setUser(newSession?.user ?? null);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      applySession(newSession);
      if (event === "SIGNED_IN" && newSession?.user) {
        // Fire-and-forget audit log; deferred so it runs after the auth handler returns
        setTimeout(() => {
          import("@/lib/auditLog").then(({ auditLog }) => {
            auditLog({ action: "auth.login", category: "auth" });
          }).catch(() => {});
        }, 0);
      }
    });

    (async () => {
      try {
        await migrateSupabaseSessionFromWebStorage();
        const remember = await getPersistedValue(REMEMBER_KEY);
        const isNative = Capacitor.isNativePlatform();
        const sameTab = !isNative && sessionStorage.getItem(TAB_MARKER_KEY) === "1";
        if (remember === "0" && (isNative || !sameTab)) {
          await supabase.auth.signOut({ scope: "local" });
        }
        if (!isNative) sessionStorage.setItem(TAB_MARKER_KEY, "1");
      } catch {
        /* ignore */
      }

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      applySession(currentSession);
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await removePersistedValue(REMEMBER_KEY);
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
