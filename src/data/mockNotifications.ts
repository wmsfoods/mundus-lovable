import type { NotificationItem } from "@/components/notifications/NotificationDropdown";

export const supplierNotifications: NotificationItem[] = [
  { id: "s1", type: "auction_bid", title: "New bid received", body: "Hong Kong Foods placed a bid on MDS-A#00003", time: "2 min ago", unread: true, icon: "🔨", to: "/supplier/auctions" },
  { id: "s2", type: "auction_bid", title: "New bid received", body: "Delta Imports placed a bid on MDS-A#00003", time: "15 min ago", unread: true, icon: "🔨", to: "/supplier/auctions" },
  { id: "s3", type: "auction_closed", title: "Auction window closed", body: "MDS-A#00003 closed with 6 bids. Review and award.", time: "1 hour ago", unread: true, icon: "⏰", to: "/supplier/auctions" },
  { id: "s4", type: "negotiation", title: "New bid on Beef Forequarter", body: "Alpha Foods bid $6.10/kg on offer #00045", time: "3 hours ago", unread: false, icon: "💬", to: "/supplier/negotiations" },
  { id: "s5", type: "order", title: "Order confirmed", body: "Delta Imports confirmed order #00044", time: "1 day ago", unread: false, icon: "✅", to: "/supplier/sales" },
];

export const buyerNotifications: NotificationItem[] = [
  { id: "b1", type: "auction_awarded", title: "Auction result", body: "You won MDS-A#00002! Confirm within 48h.", time: "5 min ago", unread: true, icon: "🏆", to: "/buyer/orders" },
  { id: "b2", type: "auction_lost", title: "Auction result", body: "Your bid on MDS-A#00003 was not selected.", time: "1 hour ago", unread: true, icon: "📊", to: "/buyer/offers" },
  { id: "b3", type: "counter", title: "Counter-offer received", body: "Alpha Foods countered at $6.05/kg", time: "4 hours ago", unread: false, icon: "💬", to: "/buyer/negotiations" },
  { id: "b4", type: "new_offer", title: "New offer available", body: "Beef Brisket from Alpha Foods — BR → China", time: "1 day ago", unread: false, icon: "📦", to: "/buyer/offers" },
];