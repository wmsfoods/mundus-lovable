import type { NotificationItem } from "@/components/notifications/NotificationDropdown";

/**
 * IDs abaixo são placeholders enquanto não existe uma tabela `notifications`.
 * Quando o backend for plugado, cada evento deve emitir uma notificação
 * carregando `entityId` (UUID real da entidade-alvo) e o `type` correspondente.
 * O deeplink é resolvido em `resolveNotificationRoute(type, entityId, audience)`.
 */
export const supplierNotifications: NotificationItem[] = [
  { id: "s1", type: "auction_bid",      entityId: "auction-00003", entityType: "auction",     title: "New bid received",      body: "Hong Kong Foods placed a bid on MDS-A#00003",      time: "2 min ago",   unread: true,  icon: "🔨" },
  { id: "s2", type: "auction_bid",      entityId: "auction-00003", entityType: "auction",     title: "New bid received",      body: "Delta Imports placed a bid on MDS-A#00003",        time: "15 min ago",  unread: true,  icon: "🔨" },
  { id: "s3", type: "auction_closed",   entityId: "auction-00003", entityType: "auction",     title: "Auction window closed", body: "MDS-A#00003 closed with 6 bids. Review and award.", time: "1 hour ago",  unread: true,  icon: "⏰" },
  { id: "s4", type: "bid_received",     entityId: "neg-00045",     entityType: "negotiation", title: "New bid on Beef Forequarter", body: "Alpha Foods bid $6.10/kg on offer #00045",  time: "3 hours ago", unread: false, icon: "💬" },
  { id: "s5", type: "order_confirmed",  entityId: "sale-00044",    entityType: "sale",        title: "Order confirmed",       body: "Delta Imports confirmed order #00044",             time: "1 day ago",   unread: false, icon: "✅" },
];

export const buyerNotifications: NotificationItem[] = [
  { id: "b1", type: "auction_awarded",  entityId: "order-00002",   entityType: "order",       title: "Auction result",        body: "You won MDS-A#00002! Confirm within 48h.",          time: "5 min ago",   unread: true,  icon: "🏆" },
  { id: "b2", type: "auction_lost",     entityId: "offer-00003",   entityType: "offer",       title: "Auction result",        body: "Your bid on MDS-A#00003 was not selected.",         time: "1 hour ago",  unread: true,  icon: "📊" },
  { id: "b3", type: "counter_received", entityId: "neg-00012",     entityType: "negotiation", title: "Counter-offer received", body: "Alpha Foods countered at $6.05/kg",                time: "4 hours ago", unread: false, icon: "💬" },
  { id: "b4", type: "new_offer",        entityId: "offer-00099",   entityType: "offer",       title: "New offer available",   body: "Beef Brisket from Alpha Foods — BR → China",        time: "1 day ago",   unread: false, icon: "📦" },
];