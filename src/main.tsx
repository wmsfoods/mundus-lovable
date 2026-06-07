import { initSentry } from "@/lib/sentry";
initSentry();

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { initCapacitor } from "./capacitor";
import { applyPlatformBodyClasses } from "./lib/platform";
import { ErrorBoundary } from "./components/ErrorBoundary";
import * as Sentry from "@sentry/react";

applyPlatformBodyClasses();
void initCapacitor();

(() => {
  if (typeof window === "undefined") return;
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    }).catch(() => {});
  }
  if ("caches" in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
  }
})();

window.addEventListener("error", (e) => {
  // eslint-disable-next-line no-console
  console.error("[window.error]", e.error ?? e.message);
});
window.addEventListener("unhandledrejection", (e) => {
  // eslint-disable-next-line no-console
  console.error("[unhandledrejection]", e.reason);
});

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<p>Something went wrong. Please refresh.</p>}>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </Sentry.ErrorBoundary>,
);
