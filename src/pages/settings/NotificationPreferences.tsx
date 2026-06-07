import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { App } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeftIcon } from "@/components/icons";
import { isNativeApp } from "@/lib/isNativeApp";
import { getPushPermissionStatus, registerPushNotifications } from "@/lib/pushNotifications";

const WINE = "#8B2252";

type Prefs = {
  in_app: boolean;
  email: boolean;
  push: boolean;
  new_request_response: boolean;
  negotiation_rounds: boolean;
  order_status_changes: boolean;
  new_buyer_request: boolean;
  offer_deactivated: boolean;
  deal_closed: boolean;
  shipping_instructions: boolean;
  new_chat_message: boolean;
};

const DEFAULTS: Prefs = {
  in_app: true,
  email: true,
  push: true,
  new_request_response: true,
  negotiation_rounds: true,
  order_status_changes: true,
  new_buyer_request: true,
  offer_deactivated: true,
  deal_closed: true,
  shipping_instructions: true,
  new_chat_message: true,
};

function ToggleRow({
  label,
  sublabel,
  value,
  onChange,
}: {
  label: string;
  sublabel?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 0",
        borderBottom: "1px solid #f0eeee",
        cursor: "pointer",
        gap: 16,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{sublabel}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        style={{
          width: 42,
          height: 24,
          borderRadius: 999,
          background: value ? WINE : "#d4d4d4",
          border: "none",
          position: "relative",
          cursor: "pointer",
          transition: "background 0.15s",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: value ? 20 : 2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.15s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        />
      </button>
    </label>
  );
}

export default function NotificationPreferences() {
  const location = useLocation();
  const backTo = location.pathname.includes("/supplier") ? "/supplier" : "/buyer";
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushPerm, setPushPerm] = useState<string>("");
  const [pushEnabling, setPushEnabling] = useState(false);
  const native = isNativeApp();

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!active || !user) return;
      setEmail(user.email ?? "");

      const { data: existing } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        setPrefs({
          in_app: existing.in_app,
          email: existing.email,
          push: existing.push ?? true,
          new_request_response: existing.new_request_response,
          negotiation_rounds: existing.negotiation_rounds,
          order_status_changes: existing.order_status_changes,
          new_buyer_request: existing.new_buyer_request,
          offer_deactivated: existing.offer_deactivated,
          deal_closed: existing.deal_closed,
          shipping_instructions: existing.shipping_instructions,
          new_chat_message: existing.new_chat_message,
        });
      } else {
        // Auto-create defaults on first visit
        await supabase.from("notification_preferences").insert({
          user_id: user.id,
          ...DEFAULTS,
        });
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!native) return;
    void getPushPermissionStatus().then(setPushPerm);
  }, [native]);

  const enablePushOnDevice = async () => {
    setPushEnabling(true);
    const result = await registerPushNotifications();
    const status = await getPushPermissionStatus();
    setPushPerm(status);
    setPushEnabling(false);
    if (result === "denied") {
      await App.openUrl({ url: "app-settings:" });
    }
  };

  const update = async (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase
        .from("notification_preferences")
        .upsert(
          { user_id: userData.user.id, ...next },
          { onConflict: "user_id" },
        );
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--fg-muted)" }}>Loading…</div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 16px 48px" }}>
      <Link
        to={backTo}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          color: "var(--fg-muted)",
          textDecoration: "none",
          fontSize: 13,
          marginBottom: 16,
        }}
      >
        <ChevronLeftIcon size={14} /> Back
      </Link>

      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Notification Preferences</h1>
      <p style={{ color: "var(--fg-muted)", fontSize: 13, marginBottom: 24 }}>
        Choose how and when Mundus contacts you. {saving && <span style={{ color: WINE }}>Saving…</span>}
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Channels
        </h2>
        <ToggleRow
          label="In-app notifications"
          sublabel="Real-time alerts inside Mundus"
          value={prefs.in_app}
          onChange={(v) => update({ in_app: v })}
        />
        <ToggleRow
          label="Email"
          sublabel={email ? `${email} · digest` : "Email digest"}
          value={prefs.email}
          onChange={(v) => update({ email: v })}
        />
        <ToggleRow
          label="Push notifications"
          sublabel="Alerts on your phone (Mundus app)"
          value={prefs.push}
          onChange={(v) => update({ push: v })}
        />
        {native && pushPerm !== "granted" && (
          <div
            style={{
              marginTop: 12,
              padding: 14,
              borderRadius: 10,
              background: "#fdf2f8",
              border: "1px solid #f5d0e0",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>
              Enable alerts on this iPhone
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-muted)", marginBottom: 10 }}>
              {pushPerm === "denied"
                ? "Notifications are off for Mundus. Tap below to open Settings."
                : "Tap to allow push notifications on this device."}
            </div>
            <button
              type="button"
              onClick={() => void enablePushOnDevice()}
              disabled={pushEnabling}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                background: WINE,
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                cursor: pushEnabling ? "wait" : "pointer",
              }}
            >
              {pushEnabling ? "Enabling…" : pushPerm === "denied" ? "Open Settings" : "Allow notifications"}
            </button>
          </div>
        )}
      </section>

      <section>
        <h2
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          What to notify me about
        </h2>
        <ToggleRow
          label="Chat messages"
          sublabel="New messages in any conversation"
          value={prefs.new_chat_message}
          onChange={(v) => update({ new_chat_message: v })}
        />
        <ToggleRow
          label="Negotiation rounds"
          sublabel="Proposals, counter-offers, acceptances"
          value={prefs.negotiation_rounds}
          onChange={(v) => update({ negotiation_rounds: v })}
        />
        <ToggleRow
          label="Order status changes"
          sublabel="Dispatched, in transit, delivered"
          value={prefs.order_status_changes}
          onChange={(v) => update({ order_status_changes: v })}
        />
        <ToggleRow
          label="Request responses"
          sublabel="A supplier responded to your request"
          value={prefs.new_request_response}
          onChange={(v) => update({ new_request_response: v })}
        />
        <ToggleRow
          label="New buyer requests"
          sublabel="A new request matches your catalog (suppliers)"
          value={prefs.new_buyer_request}
          onChange={(v) => update({ new_buyer_request: v })}
        />
        <ToggleRow
          label="Deal closed"
          sublabel="Negotiation accepted and order created"
          value={prefs.deal_closed}
          onChange={(v) => update({ deal_closed: v })}
        />
        <ToggleRow
          label="Offer deactivated"
          sublabel="An offer you were negotiating was deactivated"
          value={prefs.offer_deactivated}
          onChange={(v) => update({ offer_deactivated: v })}
        />
        <ToggleRow
          label="Shipping instructions"
          sublabel="SI requests and submissions"
          value={prefs.shipping_instructions}
          onChange={(v) => update({ shipping_instructions: v })}
        />
      </section>
    </div>
  );
}