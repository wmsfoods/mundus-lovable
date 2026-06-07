// APNs HTTP/2 push sender using token-based authentication (.p8 ES256).
// Apple's HTTP/2 endpoint is reachable from Deno's fetch (it negotiates h2).

export type ApnsConfig = {
  keyId: string;
  teamId: string;
  bundleId: string;
  privateKeyPem: string;
  environment: "sandbox" | "production";
};

export type ApnsSendResult = {
  ok: boolean;
  status?: number;
  reason?: string;
  error?: string;
  unregistered?: boolean;
};

function base64Url(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlJson(obj: Record<string, unknown>): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(obj)));
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

// Convert WebCrypto raw ECDSA signature (r||s, 64 bytes) — APNs JWT expects exactly that.
let cachedToken: { token: string; exp: number } | null = null;

async function getProviderToken(cfg: ApnsConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;

  const keyData = pemToArrayBuffer(cfg.privateKeyPem.replace(/\\n/g, "\n"));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const header = { alg: "ES256", kid: cfg.keyId, typ: "JWT" };
  const payload = { iss: cfg.teamId, iat: now };
  const unsigned = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(unsigned),
  );
  const token = `${unsigned}.${base64Url(new Uint8Array(sig))}`;

  // APNs tokens are valid up to 1h; refresh every ~50 min.
  cachedToken = { token, exp: now + 50 * 60 };
  return token;
}

export function parseApnsConfig(): ApnsConfig | null {
  const keyId = Deno.env.get("APNS_KEY_ID") ?? "";
  const teamId = Deno.env.get("APNS_TEAM_ID") ?? "";
  const bundleId = Deno.env.get("APNS_BUNDLE_ID") ?? "";
  const privateKeyPem = Deno.env.get("APNS_PRIVATE_KEY") ?? "";
  const envRaw = (Deno.env.get("APNS_ENVIRONMENT") ?? "production").toLowerCase();
  if (!keyId || !teamId || !bundleId || !privateKeyPem) return null;
  const environment: "sandbox" | "production" =
    envRaw === "sandbox" || envRaw === "development" ? "sandbox" : "production";
  return { keyId, teamId, bundleId, privateKeyPem, environment };
}

export async function sendApnsToToken(
  cfg: ApnsConfig,
  deviceToken: string,
  payload: { title: string; body?: string; url?: string },
): Promise<ApnsSendResult> {
  // Sanity-check device token format (APNs hex). FCM tokens are colon-delimited and won't work here.
  const cleanToken = deviceToken.replace(/\s/g, "");
  if (!/^[0-9a-fA-F]{32,200}$/.test(cleanToken)) {
    return { ok: false, reason: "BadDeviceToken", error: "token_not_hex", unregistered: true };
  }

  let providerToken: string;
  try {
    providerToken = await getProviderToken(cfg);
  } catch (e) {
    return { ok: false, reason: "ProviderTokenError", error: e instanceof Error ? e.message : String(e) };
  }

  const host =
    cfg.environment === "sandbox"
      ? "api.sandbox.push.apple.com"
      : "api.push.apple.com";

  const body = {
    aps: {
      alert: { title: payload.title, body: payload.body ?? "" },
      sound: "default",
      "mutable-content": 1,
    },
    ...(payload.url ? { url: payload.url } : {}),
  };

  let res: Response;
  try {
    res = await fetch(`https://${host}/3/device/${cleanToken}`, {
      method: "POST",
      headers: {
        authorization: `bearer ${providerToken}`,
        "apns-topic": cfg.bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, reason: "NetworkError", error: e instanceof Error ? e.message : String(e) };
  }

  if (res.status === 200) {
    await res.body?.cancel();
    return { ok: true, status: 200 };
  }

  let reason = "";
  try {
    const txt = await res.text();
    try {
      reason = (JSON.parse(txt)?.reason as string) ?? txt;
    } catch {
      reason = txt;
    }
  } catch {
    // ignore
  }

  const unregistered =
    res.status === 410 ||
    reason === "Unregistered" ||
    reason === "BadDeviceToken" ||
    reason === "DeviceTokenNotForTopic";

  return { ok: false, status: res.status, reason, error: reason, unregistered };
}