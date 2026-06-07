import * as jose from "npm:jose@5";

export type ApnsConfig = {
  keyId: string;
  teamId: string;
  privateKey: string;
  bundleId: string;
  useSandbox: boolean;
};

export type ApnsSendResult = {
  ok: boolean;
  error?: string;
  badToken?: boolean;
};

export function parseApnsConfig(): ApnsConfig | null {
  const keyId = Deno.env.get("APNS_KEY_ID") ?? "";
  const teamId = Deno.env.get("APNS_TEAM_ID") ?? "";
  const privateKey = (Deno.env.get("APNS_PRIVATE_KEY") ?? "").replace(/\\n/g, "\n");
  const bundleId = Deno.env.get("APNS_BUNDLE_ID") ?? "com.mundustrade.app";
  const env = (Deno.env.get("APNS_ENVIRONMENT") ?? "production").toLowerCase();

  if (!keyId || !teamId || !privateKey.includes("PRIVATE KEY")) {
    return null;
  }

  return {
    keyId,
    teamId,
    privateKey,
    bundleId,
    useSandbox: env === "sandbox",
  };
}

async function createApnsJwt(config: ApnsConfig): Promise<string> {
  const key = await jose.importPKCS8(config.privateKey, "ES256");
  return await new jose.SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: config.keyId })
    .setIssuer(config.teamId)
    .setIssuedAt()
    .sign(key);
}

export async function sendApnsToToken(
  config: ApnsConfig,
  deviceToken: string,
  payload: { title: string; body?: string; url?: string },
): Promise<ApnsSendResult> {
  const host = config.useSandbox
    ? "https://api.sandbox.push.apple.com"
    : "https://api.push.apple.com";

  const token = deviceToken.replace(/\s/g, "").toLowerCase();

  let jwt: string;
  try {
    jwt = await createApnsJwt(config);
  } catch (err) {
    return { ok: false, error: `jwt_failed: ${err}` };
  }

  const body: Record<string, unknown> = {
    aps: {
      alert: { title: payload.title, body: payload.body ?? "" },
      sound: "default",
    },
  };
  if (payload.url) body.url = payload.url;

  const res = await fetch(`${host}/3/device/${token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": config.bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.ok) return { ok: true };

  const txt = await res.text();
  const badToken =
    res.status === 410 ||
    txt.includes("BadDeviceToken") ||
    txt.includes("Unregistered") ||
    txt.includes("DeviceTokenNotForTopic");

  return { ok: false, error: `${res.status}: ${txt}`, badToken };
}

/** Try production first, then sandbox (Xcode debug often uses sandbox tokens). */
export async function sendApnsWithFallback(
  config: ApnsConfig,
  deviceToken: string,
  payload: { title: string; body?: string; url?: string },
): Promise<ApnsSendResult> {
  const primary = await sendApnsToToken(config, deviceToken, payload);
  if (primary.ok) return primary;

  if (!config.useSandbox && primary.badToken) {
    const sandbox = await sendApnsToToken(
      { ...config, useSandbox: true },
      deviceToken,
      payload,
    );
    if (sandbox.ok) return sandbox;
    return sandbox;
  }

  return primary;
}
