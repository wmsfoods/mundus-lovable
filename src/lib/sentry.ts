import * as Sentry from "@sentry/react";

// 👇 COLE AQUI O DSN DO SENTRY (entre as aspas).
// Ex: "https://abc123@o456.ingest.sentry.io/789"
const SENTRY_DSN_INLINE = "";

export function initSentry() {
  if (!import.meta.env.PROD) return;
  const dsn =
    (import.meta.env.VITE_SENTRY_DSN as string | undefined) ||
    SENTRY_DSN_INLINE;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: "production",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
  });
}