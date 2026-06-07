import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { notificationPreferencesPath } from "@/lib/mobile-nav";
import "@/styles/mundus-notifications.css";

const WINE = "#8B2252";

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
  const location = useLocation();
  const prefsPath = notificationPreferencesPath(location.pathname);
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
    <div className="ntf-page">
      <div className="ntf-header">
        <h1>Notifications</h1>
        <div className="ntf-actions">
          {unreadCount > 0 && (
            <button type="button" onClick={markAllRead}>
              Mark all read
            </button>
          )}
          <Link to={prefsPath}>
            <SettingsIcon size={14} /> Preferences
          </Link>
        </div>
      </div>

      <div className="ntf-chips">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`ntf-chip ${category === c.id ? "is-active" : ""}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="ntf-list">
        {loading && notifications.length === 0 ? (
          <div className="ntf-empty">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="ntf-empty">
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
                className={`ntf-row ${!n.read ? "is-unread" : ""}`}
              >
                <div className="ntf-icon-wrap">
                  <Icon size={18} style={{ color: WINE }} />
                </div>
                <div className="ntf-body">
                  <div className="ntf-title">{n.title}</div>
                  {n.body && <div className="ntf-desc">{n.body}</div>}
                </div>
                <div className="ntf-meta">
                  {formatTimeAgo(n.created_at)}
                  {!n.read && <span className="ntf-dot" />}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
