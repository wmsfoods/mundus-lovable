import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onPushNavigate } from "@/lib/pushNotifications";

/** Handles deep links from push notification taps (native only). */
export function PushNavigationHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    return onPushNavigate((url) => {
      if (url.startsWith("/")) navigate(url);
    });
  }, [navigate]);

  return null;
}
