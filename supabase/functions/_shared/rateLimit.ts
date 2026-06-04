import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface RateLimitOptions {
  key: string;
  windowSeconds: number;
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
  limit: number;
}

/**
 * Check a rate limit bucket. Fail-open: if the DB check itself errors,
 * the request is allowed through (we never want infra to break product UX).
 */
export async function checkRateLimit(
  admin: SupabaseClient,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const fallback: RateLimitResult = {
    allowed: true,
    remaining: opts.max,
    resetAt: new Date(Date.now() + opts.windowSeconds * 1000),
    retryAfterSeconds: 0,
    limit: opts.max,
  };
  try {
    const { data, error } = await admin.rpc('check_rate_limit', {
      p_key: opts.key,
      p_window_seconds: opts.windowSeconds,
      p_max: opts.max,
    });
    if (error || !data || !Array.isArray(data) || data.length === 0) {
      console.warn('[rateLimit] fail-open:', error?.message ?? 'no data');
      return fallback;
    }
    const row: any = data[0];
    const resetAt = new Date(row.reset_at);
    const retryAfter = Math.max(0, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
    return {
      allowed: Boolean(row.allowed),
      remaining: Number(row.remaining ?? 0),
      resetAt,
      retryAfterSeconds: retryAfter,
      limit: opts.max,
    };
  } catch (e) {
    console.warn('[rateLimit] fail-open exception:', e instanceof Error ? e.message : e);
    return fallback;
  }
}

/** Build a standardized 429 response. Caller must merge any extra CORS headers. */
export function rateLimitResponse(
  result: RateLimitResult,
  extraHeaders: Record<string, string> = {},
): Response {
  const body = {
    error: 'rate_limited',
    message: `Too many requests. Try again in ${result.retryAfterSeconds}s.`,
    retry_after: result.retryAfterSeconds,
  };
  return new Response(JSON.stringify(body), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': result.resetAt.toISOString(),
      'Retry-After': String(result.retryAfterSeconds),
      ...extraHeaders,
    },
  });
}

/** Best-effort extraction of the caller IP from edge runtime headers. */
export function getClientIp(req: Request): string {
  const h = req.headers;
  const cf = h.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const xff = h.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = h.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

/** Quick admin-bypass check. Returns true if the user has mundus_admin role. */
export async function isMundusAdmin(
  admin: SupabaseClient,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data } = await admin
      .from('company_users')
      .select('role, roles:role_id(name)')
      .eq('user_id', userId);
    if (!data) return false;
    return data.some((r: any) =>
      r.role === 'mundus_admin' || r.roles?.name === 'mundus_admin'
    );
  } catch {
    return false;
  }
}
