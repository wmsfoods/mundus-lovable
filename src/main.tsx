import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { initCapacitor } from "./capacitor";

void initCapacitor();

// PWA service worker registration — production only, never in iframe or Lovable preview
(() => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const isInIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("lovableproject.com") ||
    host.includes("lovableproject-dev.com") ||
    host.includes("id-preview--") ||
    host.includes("preview--");
  if (isInIframe || isPreviewHost || import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    }).catch(() => {});
    return;
  }
  import("virtual:pwa-register")
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {});
})();

createRoot(document.getElementById("root")!).render(<App />);
