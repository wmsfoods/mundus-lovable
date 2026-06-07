import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { notificationPreferencesPath } from "@/lib/mobile-nav";
import { Settings as SettingsIcon } from "lucide-react";

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

export function NotificationBell() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefsPath = notificationPreferencesPath(location.pathname);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("all");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const {
    unreadCount,
    notifications,
    loadNotifications,
    markRead,
    markAllRead,
  } = useAppNotifications({ limit: 20 });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) loadNotifications();
  };

  const handleClick = async (n: AppNotification) => {
    if (!n.read) await markRead(n.id);
    if (n.link_url) {
      setOpen(false);
      navigate(n.link_url);
    }
  };

  const filtered =
    category === "all" ? notifications : notifications.filter((n) => n.category === category);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={handleOpen}
        className="tb-bell"
        aria-label="Notifications"
      >
        <BellIcon size={18} />
        {unreadCount > 0 && (
          <span
            className="dot"
            style={{
              width: 16,
              height: 16,
              top: 4,
              right: 4,
              background: "#dc2626",
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="nb-panel"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 380,
            maxWidth: "calc(100vw - 16px)",
            maxHeight: 480,
            background: "#fff",
            border: "1px solid hsl(var(--border))",
            borderRadius: 12,
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid hsl(var(--border))",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700 }}>Notifications</span>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  style={{
                    fontSize: 12,
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
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate(prefsPath);
                }}
                title="Notification preferences"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--fg-muted)",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <SettingsIcon size={16} />
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 6,
              padding: "8px 16px",
              borderBottom: "1px solid #f5f4f3",
              overflowX: "auto",
              flexShrink: 0,
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
                    padding: "4px 10px",
                    fontSize: 11,
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

          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: 32,
                  textAlign: "center",
                  color: "var(--fg-muted)",
                  fontSize: 13,
                }}
              >
                No notifications yet
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
                      padding: "12px 16px",
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
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: WINE_TINT,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={16} style={{ color: WINE }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: n.read ? 400 : 600,
                          color: "var(--fg)",
                        }}
                      >
                        {n.title}
                      </div>
                      {n.body && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--fg-muted)",
                            marginTop: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {n.body}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
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

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
            style={{
              padding: "10px 16px",
              borderTop: "1px solid hsl(var(--border))",
              background: "#fff",
              border: "none",
              borderBottomLeftRadius: 12,
              borderBottomRightRadius: 12,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: WINE,
              textAlign: "center",
            }}
          >
            See all notifications
          </button>
        </div>
      )}
    </div>
  );
}