import { toast } from "sonner";
import i18n from "@/i18n";

/**
 * Detect rate-limit (429) responses from edge functions and show a friendly toast.
 * Returns true if the error was handled (rate limit), false otherwise.
 *
 * Works with both:
 *  - supabase.functions.invoke result: { data, error } — pass `error` here
 *  - fetch() Response — pass the Response here
 */
export async function handleRateLimit(input: unknown): Promise<boolean> {
  try {
    // supabase-js v2 FunctionsHttpError shape
    const anyErr = input as any;
    if (anyErr && typeof anyErr === "object" && anyErr.context instanceof Response) {
      const resp: Response = anyErr.context;
      if (resp.status === 429) {
        let retry = 60;
        try {
          const cloned = resp.clone();
          const j = await cloned.json();
          retry = Number(j?.retry_after ?? resp.headers.get("Retry-After") ?? 60);
        } catch {
          retry = Number(resp.headers.get("Retry-After") ?? 60);
        }
        showRateLimitToast(retry);
        return true;
      }
    }
    // Raw fetch Response
    if (input instanceof Response && input.status === 429) {
      let retry = 60;
      try {
        const j = await input.clone().json();
        retry = Number(j?.retry_after ?? input.headers.get("Retry-After") ?? 60);
      } catch {
        retry = Number(input.headers.get("Retry-After") ?? 60);
      }
      showRateLimitToast(retry);
      return true;
    }
  } catch {
    /* swallow */
  }
  return false;
}

function showRateLimitToast(retryAfterSeconds: number) {
  const seconds = Math.max(1, Math.ceil(retryAfterSeconds));
  const msg = i18n.t("common.rateLimited", {
    seconds,
    defaultValue: `Too many requests. Try again in ${seconds}s.`,
  });
  toast.error(msg);
}
