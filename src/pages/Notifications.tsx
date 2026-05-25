import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Settings as SettingsIcon } from "lucide-react";
import {
  BellIcon,
  CartIcon,
  MessageIcon,
  DollarIcon,
  ShipIcon,
  AlertIcon,
  CheckIcon,
} from "@/components/icons";
import { useAppNotifications, type AppNotification } from "@/hooks/useAppNotifications";
import { formatTimeAgo } from "@/lib/notifications";

const WINE = "#8B2252";
const WINE_TINT = "#FBEAF0";
const WINE_BG = "#fdf8fa";

const ICON_MAP: Record<string, (p: { size?: number; style?: React.CSSProperties }) => JSX.Element> = {
  bell: BellIcon,
  package: CartIcon,
  chat: MessageIcon,
  dollar: DollarIcon,
  truck: ShipIcon,
  alert: AlertIcon,
  check: CheckIcon,
};

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "orders", label: "Orders" },
  { id: "negotiations", label: "Negotiations" },
  { id: "offers", label: "Offers" },
  { id: "requests", label: "Requests" },
  { id: "chat", label: "Chat" },
  { id: "system", label: "System" },
];

export default function Notifications() {
  const navigate = useNavigate();
  const { unreadCount, notifications, loadNotifications, markRead, markAllRead, loading } =
    useAppNotifications({ limit: 100 });
  const [category, setCategory] = useState("all");

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleClick = async (n: AppNotification) => {
    if (!n.read) await markRead(n.id);
    if (n.link_url) navigate(n.link_url);
  };

  const filtered =
    category === "all" ? notifications : notifications.filter((n) => n.category === category);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 16px 48px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Notifications</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              style={{
                fontSize: 13,
                color: WINE,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Mark all read
            </button>
          )}
          <Link
            to="/settings/notifications"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 13,
              color: "var(--fg-muted)",
              textDecoration: "none",
            }}
          >
            <SettingsIcon size={14} /> Preferences
          </Link>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 12,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {CATEGORIES.map((c) => {
          const active = category === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 999,
                border: "1px solid",
                borderColor: active ? WINE : "hsl(var(--border))",
                background: active ? WINE_TINT : "#fff",
                color: active ? WINE : "var(--fg)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          border: "1px solid hsl(var(--border))",
          borderRadius: 12,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        {loading && notifications.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--fg-muted)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--fg-muted)" }}>
            No notifications {category !== "all" ? "in this category" : "yet"}
          </div>
        ) : (
          filtered.map((n) => {
            const Icon = ICON_MAP[n.icon] ?? BellIcon;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClick(n)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "14px 16px",
                  cursor: "pointer",
                  background: n.read ? "#fff" : WINE_BG,
                  borderBottom: "1px solid #f5f4f3",
                  display: "flex",
                  gap: 12,
                  border: "none",
                  borderLeft: n.read ? "none" : `3px solid ${WINE}`,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: WINE_TINT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} style={{ color: WINE }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: n.read ? 400 : 600 }}>{n.title}</div>
                  {n.body && (
                    <div style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 2 }}>
                      {n.body}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--fg-muted)",
                    whiteSpace: "nowrap",
                    textAlign: "right",
                  }}
                >
                  {formatTimeAgo(n.created_at)}
                  {!n.read && (
                    <span
                      style={{
                        display: "block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: WINE,
                        marginTop: 4,
                        marginLeft: "auto",
                      }}
                    />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}