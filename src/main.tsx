import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { initCapacitor } from "./capacitor";

void initCapacitor();

// Cleanup any previously-registered service workers + caches.
// We rely on manifest.json + apple-touch-icon for "Add to Home Screen"
// (no SW needed) and Capacitor handles the native mobile shell.
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

createRoot(document.getElementById("root")!).render(<App />);
