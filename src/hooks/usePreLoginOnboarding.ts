import { useCallback, useEffect, useState } from "react";
import { getPersistedValue, removePersistedValue, setPersistedValue } from "@/lib/authStorage";
import { isNativeApp } from "@/lib/isNativeApp";

const DONE_KEY = "mundus_pre_onboarding_done_v1";
const ROLE_KEY = "mundus_pre_onboarding_role_v1";
/** Set when onboarding finishes; Signup must not open until guest home is shown once. */
const GUEST_HOME_GATE_KEY = "mundus_post_onboarding_login_gate_v1";

/** Default landing for guests after onboarding (native + web). */
export const POST_ONBOARDING_PATH = "/home" as const;

export type PreLoginRole = "buyer" | "supplier";

function isReplayFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("replayOnboarding") === "1";
  } catch {
    return false;
  }
}

export function usePreLoginOnboarding() {
  const isNative = isNativeApp();
  const [loading, setLoading] = useState(isNative);
  const [done, setDone] = useState(!isNative);

  useEffect(() => {
    if (!isNative) {
      setLoading(false);
      setDone(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        if (isReplayFlag()) {
          await removePersistedValue(DONE_KEY);
          await removePersistedValue(ROLE_KEY);
          await removePersistedValue(GUEST_HOME_GATE_KEY);
        }
        const val = await getPersistedValue(DONE_KEY);
        if (!cancelled) setDone(val === "1");
      } catch {
        if (!cancelled) setDone(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isNative]);

  const complete = useCallback(
    async (role?: PreLoginRole) => {
      if (!isNative) {
        setDone(true);
        return;
      }
      try {
        await setPersistedValue(DONE_KEY, "1");
        if (role) await setPersistedValue(ROLE_KEY, role);
        await setPersistedValue(GUEST_HOME_GATE_KEY, "1");
      } catch {
        /* still mark done in memory */
      }
      setDone(true);
    },
    [isNative],
  );

  const shouldShow = isNative && !loading && !done;

  return { isNative, loading, done, shouldShow, complete };
}

/** True while user must land on guest home before opening /signup (post-onboarding). */
export async function shouldRedirectSignupToGuestHome(): Promise<boolean> {
  const v = await getPersistedValue(GUEST_HOME_GATE_KEY);
  return v === "1";
}

/** Call when guest home mounts — user may proceed to login/signup from here. */
export async function clearPostOnboardingGuestGate(): Promise<void> {
  await removePersistedValue(GUEST_HOME_GATE_KEY);
}

/** Read role saved after onboarding (for Signup prefill). */
export async function getPreLoginOnboardingRole(): Promise<PreLoginRole | null> {
  const v = await getPersistedValue(ROLE_KEY);
  if (v === "buyer" || v === "supplier") return v;
  return null;
}
