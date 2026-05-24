import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { buyerNotifications, supplierNotifications } from "@/data/mockNotifications";
import type { NotificationItem } from "@/components/notifications/NotificationDropdown";
import { resolveNotificationRoute } from "@/lib/notificationTypes";

export default function Notifications() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const audience: "buyer" | "supplier" =
    location.pathname.startsWith("/supplier") ? "supplier" : "buyer";
  const initial = audience === "supplier" ? supplierNotifications : buyerNotifications;
  const [items, setItems] = useState<NotificationItem[]>(initial);
  const unreadCount = useMemo(() => items.filter((n) => n.unread).length, [items]);

  const markAllRead = () =>
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));

  const handleClick = (n: NotificationItem) => {
    setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, unread: false } : it)));
    const target = n.to ?? resolveNotificationRoute(n.type, n.entityId, audience);
    if (target) navigate(target);
  };

  return (
    <div style={{ padding: 16 }}>
      {unreadCount > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs text-primary hover:underline"
          >
            {t("notifications.markAllRead", { defaultValue: "Mark all as read" })}
          </button>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground" style={{ textAlign: "center", padding: 32 }}>
            {t("notifications.empty", { defaultValue: "No notifications yet" })}
          </div>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleClick(n)}
              className={`w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors flex gap-3 ${
                n.unread ? "bg-primary/5" : "bg-card"
              }`}
            >
              <div className="text-xl leading-none mt-0.5 shrink-0">{n.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-sm">{n.title}</div>
                  {n.unread && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>
                <div className="text-[11px] text-muted-foreground/70 mt-1">{n.time}</div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}