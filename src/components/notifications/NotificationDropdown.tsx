import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BellIcon } from "@/components/icons";
import type { NotificationType, NotificationEntityType } from "@/lib/notificationTypes";
import { resolveNotificationRoute } from "@/lib/notificationTypes";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  /** ID da entidade-alvo (order, negotiation, auction, etc.) usado p/ deeplink */
  entityId?: string;
  /** Tipo da entidade-alvo. Opcional — inferido de `type` se ausente. */
  entityType?: NotificationEntityType;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  icon: string;
  /** Override manual do destino. Caso ausente, é resolvido por `type` + `entityId`. */
  to?: string;
};

type Props = {
  notifications: NotificationItem[];
  ariaLabel?: string;
};

export function NotificationDropdown({ notifications, ariaLabel }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const audience: "buyer" | "supplier" =
    location.pathname.startsWith("/supplier") ? "supplier" : "buyer";
  const [items, setItems] = useState<NotificationItem[]>(notifications);
  const [open, setOpen] = useState(false);
  const unreadCount = useMemo(() => items.filter((n) => n.unread).length, [items]);

  const markAllRead = () =>
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));

  const handleClick = (n: NotificationItem) => {
    setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, unread: false } : it)));
    const target = n.to ?? resolveNotificationRoute(n.type, n.entityId, audience);
    if (target) {
      setOpen(false);
      navigate(target);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="tb-bell"
          aria-label={ariaLabel ?? t("notifications.title", { defaultValue: "Notifications" })}
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
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0 max-w-[calc(100vw-24px)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="font-semibold text-sm">
            {t("notifications.title", { defaultValue: "Notifications" })}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs text-primary hover:underline"
            >
              {t("notifications.markAllRead", { defaultValue: "Mark all as read" })}
            </button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("notifications.empty", { defaultValue: "No notifications yet" })}
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClick(n)}
                className={`w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors flex gap-3 ${
                  n.unread ? "bg-primary/5" : ""
                }`}
              >
                <div className="text-xl leading-none mt-0.5 shrink-0">{n.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm truncate">{n.title}</div>
                    {n.unread && (
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {n.body}
                  </div>
                  <div className="text-[11px] text-muted-foreground/70 mt-1">{n.time}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}