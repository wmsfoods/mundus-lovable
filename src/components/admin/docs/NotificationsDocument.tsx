import { useMemo, useState } from "react";
import {
  NOTIFICATIONS,
  CHANNEL_LABELS,
  CATEGORY_LABELS,
  type NotificationChannel,
  type NotificationEntry,
} from "@/data/notificationsCatalog";

type SubTab = "overview" | "catalog" | "coverage" | "gaps";

const CHANNEL_COLORS: Record<NotificationChannel, string> = {
  email: "#8B2252",
  in_app: "#0D9488",
  push: "#D97706",
};

function ChannelBadge({ ch }: { ch: NotificationChannel }) {
  const c = CHANNEL_COLORS[ch];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        background: `${c}15`,
        color: c,
        fontSize: 11,
        fontWeight: 600,
        marginRight: 4,
      }}
    >
      {CHANNEL_LABELS[ch].pt}
    </span>
  );
}

function EntryCard({ n }: { n: NotificationEntry }) {
  return (
    <section
      id={n.id}
      style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: 12,
        padding: 18,
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, color: "#8B2252" }}>
            {CATEGORY_LABELS[n.category].pt} · {CATEGORY_LABELS[n.category].en}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A2E", marginTop: 2 }}>
            {n.name.pt}{" "}
            <span style={{ color: "#9CA3AF", fontWeight: 400, fontSize: 13 }}>— {n.name.en}</span>
          </div>
          <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "monospace", marginTop: 2 }}>
            id: {n.id}
          </div>
        </div>
        <div>
          {n.channels.map((c) => (
            <ChannelBadge key={c} ch={c} />
          ))}
        </div>
      </div>
      <div style={{ fontSize: 12.5, marginTop: 12, color: "#374151", lineHeight: 1.55 }}>
        <div style={{ marginBottom: 6 }}>
          <b style={{ color: "#6B7280" }}>Gatilho:</b> {n.trigger.pt}
        </div>
        <div style={{ marginBottom: 6 }}>
          <b style={{ color: "#6B7280" }}>Destinatários:</b> {n.recipients.pt}
        </div>
        {n.emailTemplate && (
          <div style={{ marginBottom: 6 }}>
            <b style={{ color: "#6B7280" }}>Email · subject:</b>{" "}
            <code style={{ background: "#F3F4F6", padding: "1px 6px", borderRadius: 4 }}>
              {n.emailSubject}
            </code>{" "}
            <span style={{ color: "#9CA3AF" }}>
              · template <code>{n.emailTemplate}</code>
            </span>
          </div>
        )}
        {n.inApp && (
          <div style={{ marginBottom: 6 }}>
            <b style={{ color: "#6B7280" }}>Sino:</b> <b>{n.inApp.title.pt}</b> — {n.inApp.body.pt}
          </div>
        )}
        {n.push && (
          <div style={{ marginBottom: 6 }}>
            <b style={{ color: "#6B7280" }}>Push:</b> <b>{n.push.title.pt}</b> — {n.push.body.pt}
          </div>
        )}
        <div style={{ marginBottom: 6 }}>
          <b style={{ color: "#6B7280" }}>Código:</b>{" "}
          {n.sources.map((s, i) => (
            <code
              key={i}
              style={{
                background: "#F9FAFB",
                border: "1px solid #E5E7EB",
                padding: "1px 6px",
                borderRadius: 4,
                marginRight: 6,
                fontSize: 11.5,
              }}
            >
              {s}
            </code>
          ))}
        </div>
        {n.notes && (
          <div
            style={{
              marginTop: 8,
              padding: "8px 10px",
              background: "#FEF3C7",
              border: "1px solid #FCD34D",
              borderRadius: 6,
              color: "#92400E",
              fontSize: 12,
            }}
          >
            <b>Nota:</b> {n.notes.pt} <span style={{ color: "#B45309" }}>· EN: {n.notes.en}</span>
          </div>
        )}
      </div>
    </section>
  );
}

export function NotificationsDocument() {
  const [tab, setTab] = useState<SubTab>("overview");
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(
    () => (filter === "all" ? NOTIFICATIONS : NOTIFICATIONS.filter((n) => n.category === filter)),
    [filter],
  );

  const totals = useMemo(() => {
    const t = { total: NOTIFICATIONS.length, email: 0, in_app: 0, push: 0 };
    NOTIFICATIONS.forEach((n) => {
      n.channels.forEach((c) => {
        t[c]++;
      });
    });
    return t;
  }, []);

  const gaps = useMemo(
    () =>
      NOTIFICATIONS.filter(
        (n) =>
          n.channels.length < 3 &&
          n.category !== "auth" &&
          n.category !== "internal" &&
          n.category !== "marketing",
      ),
    [],
  );

  const tabs: Array<{ k: SubTab; l: string }> = [
    { k: "overview", l: "Visão geral" },
    { k: "catalog", l: "Catálogo" },
    { k: "coverage", l: "Cobertura" },
    { k: "gaps", l: "Gaps" },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => setTab(t.k)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid",
              borderColor: tab === t.k ? "#9B2251" : "#e5e7eb",
              background: tab === t.k ? "#fdf2f7" : "#fff",
              color: tab === t.k ? "#9B2251" : "#374151",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t.l}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            {[
              { l: "Eventos totais", v: totals.total, c: "#1A1A2E" },
              { l: "Com email", v: totals.email, c: "#8B2252" },
              { l: "Com sino (in-app)", v: totals.in_app, c: "#0D9488" },
              { l: "Com push mobile", v: totals.push, c: "#D97706" },
            ].map((s) => (
              <div
                key={s.l}
                style={{
                  background: "#fff",
                  border: "1px solid #E5E7EB",
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {s.l}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.c, marginTop: 4 }}>{s.v}</div>
              </div>
            ))}
          </div>
          <div
            style={{
              background: "#fff",
              border: "1px solid #E5E7EB",
              borderRadius: 10,
              padding: 16,
              fontSize: 13,
              lineHeight: 1.65,
              color: "#374151",
            }}
          >
            <b>Como funciona a entrega:</b>
            <ul style={{ marginTop: 8 }}>
              <li>
                <b style={{ color: "#8B2252" }}>Email</b> — chamadas a{" "}
                <code>sendEmailNotification(template, to, vars)</code> rendem HTML em{" "}
                <code>src/lib/emailTemplates.ts</code> e disparam pela edge function{" "}
                <code>send-email</code> (provedor SMTP).
              </li>
              <li>
                <b style={{ color: "#0D9488" }}>Sino (in-app)</b> — insert em{" "}
                <code>app_notifications</code> via RPC <code>enqueue_app_notifications</code>; o hook{" "}
                <code>useAppNotifications</code> + canal Realtime atualiza o sino no canto superior
                direito em tempo real.
              </li>
              <li>
                <b style={{ color: "#D97706" }}>Push mobile</b> — trigger{" "}
                <code>AFTER INSERT</code> em <code>app_notifications</code> chama a edge function{" "}
                <code>send-push</code>, que envia para FCM (Android) e APNs (iOS) usando tokens em{" "}
                <code>device_push_tokens</code>.
              </li>
            </ul>
            <div style={{ marginTop: 10, color: "#6B7280" }}>
              Preferências por usuário (futuro): <code>notification_preferences</code>.
            </div>
          </div>
        </div>
      )}

      {tab === "catalog" && (
        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setFilter("all")}
              style={pillStyle(filter === "all")}
            >
              Todas
            </button>
            {Object.entries(CATEGORY_LABELS).map(([k, lab]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                style={pillStyle(filter === k)}
              >
                {lab.pt}
              </button>
            ))}
          </div>
          {filtered.map((n) => (
            <EntryCard key={n.id} n={n} />
          ))}
        </div>
      )}

      {tab === "coverage" && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#F9FAFB" }}>
                <th style={th()}>Evento</th>
                <th style={th()}>Categoria</th>
                <th style={{ ...th(), textAlign: "center" }}>Email</th>
                <th style={{ ...th(), textAlign: "center" }}>Sino</th>
                <th style={{ ...th(), textAlign: "center" }}>Push</th>
              </tr>
            </thead>
            <tbody>
              {NOTIFICATIONS.map((n) => (
                <tr key={n.id}>
                  <td style={td()}>
                    {n.name.pt}{" "}
                    <span style={{ color: "#9CA3AF" }}>— {n.name.en}</span>
                  </td>
                  <td style={{ ...td(), color: "#6B7280", fontSize: 12 }}>
                    {CATEGORY_LABELS[n.category].pt}
                  </td>
                  {(["email", "in_app", "push"] as const).map((c) => (
                    <td
                      key={c}
                      style={{
                        ...td(),
                        textAlign: "center",
                        color: n.channels.includes(c) ? "#059669" : "#DC2626",
                        fontWeight: 700,
                      }}
                    >
                      {n.channels.includes(c) ? "✓" : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "gaps" && (
        <div
          style={{
            background: "#FEF3C7",
            border: "1px solid #F59E0B",
            borderRadius: 10,
            padding: 16,
            color: "#92400E",
            fontSize: 13,
            lineHeight: 1.65,
          }}
        >
          <b>Eventos sem cobertura completa:</b>
          <ul style={{ marginTop: 8 }}>
            {gaps.map((g) => {
              const missing = (["email", "in_app", "push"] as const).filter(
                (c) => !g.channels.includes(c),
              );
              return (
                <li key={g.id} style={{ marginBottom: 6 }}>
                  <b>{g.name.pt}</b> — falta: {missing.map((m) => CHANNEL_LABELS[m].pt).join(", ")}
                </li>
              );
            })}
          </ul>
          <div style={{ marginTop: 10, color: "#78350F" }}>
            Exclui notificações de auth, internas (CRM) e marketing — esses são por design
            single-channel.
          </div>
        </div>
      )}
    </div>
  );
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: "5px 10px",
    borderRadius: 999,
    border: "1px solid",
    borderColor: active ? "#9B2251" : "#E5E7EB",
    background: active ? "#9B2251" : "#fff",
    color: active ? "#fff" : "#374151",
    fontSize: 11.5,
    fontWeight: 600,
    cursor: "pointer",
  };
}

function th(): React.CSSProperties {
  return {
    textAlign: "left",
    padding: "8px 12px",
    fontSize: 11,
    textTransform: "uppercase",
    color: "#6B7280",
    letterSpacing: 0.5,
    borderBottom: "1px solid #E5E7EB",
  };
}
function td(): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderBottom: "1px solid #F3F4F6",
  };
}