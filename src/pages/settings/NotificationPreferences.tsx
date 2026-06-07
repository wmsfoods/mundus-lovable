import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeftIcon } from "@/components/icons";
import { useStackHeader } from "@/contexts/StackHeaderContext";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";
import { isNativeApp } from "@/lib/isNativeApp";
import { openAppSettings } from "@/lib/openAppSettings";
import { subscribeNativeAppResume } from "@/lib/nativeAppLifecycle";
import { getPushPermissionStatus, registerPushNotifications } from "@/lib/pushNotifications";
import "@/styles/mundus-notifications.css";

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
    <label className="ntf-prefs-row">
      <div className="ntf-prefs-row-text">
        <div className="ntf-prefs-row-label">{label}</div>
        {sublabel && <div className="ntf-prefs-row-sub">{sublabel}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        className={`ntf-prefs-switch ${value ? "is-on" : ""}`}
        onClick={(e) => {
          e.preventDefault();
          onChange(!value);
        }}
      >
        <span className="ntf-prefs-switch-thumb" />
      </button>
    </label>
  );
}

export default function NotificationPreferences() {
  const location = useLocation();
  const isMobile = useIsMobileShell();
  const inRoleShell = /^\/(buyer|supplier)(\/|$)/.test(location.pathname);
  const showLocalHeader = !isMobile || !inRoleShell;
  const isSupplier = location.pathname.includes("/supplier");
  const backTo = isSupplier ? "/supplier/notifications" : "/buyer/notifications";
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushPerm, setPushPerm] = useState<string>("");
  const [pushEnabling, setPushEnabling] = useState(false);
  const native = isNativeApp();

  useStackHeader({ title: "Notification preferences" });

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

    let active = true;

    const refresh = () => {
      void getPushPermissionStatus()
        .then((status) => {
          if (active) setPushPerm(status);
        })
        .catch((err) => {
          console.warn("[push] permission status failed:", err);
        });
    };

    refresh();

    let remove: (() => void) | undefined;
    void subscribeNativeAppResume(refresh).then((unsub) => {
      if (active) remove = unsub;
      else unsub();
    });

    return () => {
      active = false;
      remove?.();
    };
  }, [native]);

  const enablePushOnDevice = async () => {
    setPushEnabling(true);
    try {
      const result = await registerPushNotifications();
      setPushPerm(await getPushPermissionStatus());
      if (result === "denied") {
        await openAppSettings();
      }
    } catch (err) {
      console.warn("[push] enablePushOnDevice failed:", err);
      setPushPerm(await getPushPermissionStatus());
    } finally {
      setPushEnabling(false);
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
        .upsert({ user_id: userData.user.id, ...next }, { onConflict: "user_id" });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="ntf-prefs-loading">Loading…</div>;
  }

  return (
    <div className={`ntf-prefs-page${isMobile && inRoleShell ? " is-mobile-shell" : ""}`}>
      {showLocalHeader && (
        <header className={isMobile && !inRoleShell ? "ntf-prefs-native-head" : undefined}>
          <Link to={backTo} className="ntf-prefs-back" data-stack-hide data-page-back>
            <ChevronLeftIcon size={14} /> Back
          </Link>
          <h1 className="ntf-prefs-title" data-page-title>
            Notification Preferences
          </h1>
        </header>
      )}

      <p className="ntf-prefs-intro">
        Choose how and when Mundus contacts you.
        {saving && <span className="is-saving"> Saving…</span>}
      </p>

      <section className="ntf-prefs-section">
        <h2 className="ntf-prefs-section-title">Channels</h2>
        <div className="ntf-prefs-card">
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
            <div className="ntf-prefs-push-banner">
              <div className="ntf-prefs-push-banner-inner">
                <div className="ntf-prefs-push-text">
                  <div className="ntf-prefs-push-title">Enable alerts on this device</div>
                  <div className="ntf-prefs-push-sub">
                    {pushPerm === "denied"
                      ? "Notifications are off for Mundus. Open Settings to turn them on."
                      : "Allow push notifications to receive alerts on this phone."}
                  </div>
                </div>
                <button
                  type="button"
                  className="ntf-prefs-push-btn"
                  onClick={() => void enablePushOnDevice()}
                  disabled={pushEnabling}
                >
                  {pushEnabling
                    ? "Enabling…"
                    : pushPerm === "denied"
                      ? "Open Settings"
                      : "Allow notifications"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="ntf-prefs-section">
        <h2 className="ntf-prefs-section-title">What to notify me about</h2>
        <div className="ntf-prefs-card">
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
        </div>
      </section>
    </div>
  );
}
