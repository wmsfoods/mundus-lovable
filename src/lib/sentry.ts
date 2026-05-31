import * as Sentry from "@sentry/react";

export function initSentry() {
  if (!import.meta.env.PROD) return;
  const dsn =
    (import.meta.env.VITE_SENTRY_DSN as string | undefined) ||
    "https://f059fbc13aa7f1c762ea6c9f76152fb6@o4511483045347328.ingest.us.sentry.io/4511483048624128";
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