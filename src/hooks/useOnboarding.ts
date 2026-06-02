import { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import { getPersistedValue, setPersistedValue } from "@/lib/authStorage";

const STORAGE_PREFIX = "mundus_onboarding_completed_v1:";

function isReplayFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("replayOnboarding") === "1";
  } catch {
    return false;
  }
}

export function useOnboarding() {
  const { user, loading: authLoading } = useAuth();
  const isNative = Capacitor.isNativePlatform();
  const userId = user?.id ?? null;
  const [isLoading, setIsLoading] = useState(true);
  const [completed, setCompleted] = useState<boolean>(true);

  useEffect(() => {
    if (!isNative) {
      setIsLoading(false);
      setCompleted(true);
      return;
    }
    if (authLoading) return;
    if (!userId) {
      setIsLoading(false);
      setCompleted(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const key = STORAGE_PREFIX + userId;
      const val = await getPersistedValue(key);
      if (cancelled) return;
      const isReplay = isNative && isReplayFlag();
      setCompleted(!isReplay && val === "1");
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isNative, authLoading, userId]);

  const complete = useCallback(async () => {
    if (!isNative || !userId) {
      setCompleted(true);
      return;
    }
    await setPersistedValue(STORAGE_PREFIX + userId, "1");
    setCompleted(true);
  }, [isNative, userId]);

  const shouldShow = isNative && !isLoading && !!userId && !completed;

  return { isNative, shouldShow, complete, isLoading };
}