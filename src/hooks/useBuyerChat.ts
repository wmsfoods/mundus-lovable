export type ChatContext =
  | { type: "negotiation"; id: string; label: string }
  | { type: "offer"; id: string; label: string }
  | { type: "request"; id: string; label: string }
  | { type: "order"; id: string; label: string };

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderType: "buyer" | "supplier" | "system";
  senderName: string;
  body: string;
  sentAt: string;
  isRead: boolean;
};

export type Conversation = {
  id: string;
  supplierName: string;
  supplierInitials: string;
  supplierCountryCode: string;
  context: ChatContext;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
  isOnline: boolean;
  messages: ChatMessage[];
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ago(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

function mk(
  cid: string,
  id: string,
  senderType: ChatMessage["senderType"],
  senderName: string,
  body: string,
  hoursAgo: number,
  isRead = true
): ChatMessage {
  return {
    id,
    conversationId: cid,
    senderType,
    senderName,
    body,
    sentAt: ago(hoursAgo),
    isRead,
  };
}

const BUYER = "David";

function build(): Conversation[] {
  const c1: Conversation = {
    id: "c-001",
    supplierName: "WMS Foods",
    supplierInitials: initials("WMS Foods"),
    supplierCountryCode: "BR",
    context: { type: "negotiation", id: "bb-01", label: "Ribeye Q3 Imports" },
    lastMessagePreview: "We can hold the lot for 24h while you decide.",
    lastMessageAt: ago(0.5),
    unreadCount: 3,
    isOnline: true,
    messages: [
      mk("c-001", "m1", "supplier", "WMS Foods",
        "Hi David, we accept your bid of $124,510 on the Ribeye lot. Counter-offer attached for the Striploin.", 2),
      mk("c-001", "m2", "buyer", BUYER, "Looking at it now, will reply by EOD.", 1),
      mk("c-001", "m3", "supplier", "WMS Foods",
        "Sure, take your time. Note that we have only 2 FCLs available for May shipment.", 0.75, false),
      mk("c-001", "m4", "supplier", "WMS Foods",
        "Also we can offer a small discount if you confirm both lots together.", 0.7, false),
      mk("c-001", "m5", "supplier", "WMS Foods",
        "We can hold the lot for 24h while you decide.", 0.5, false),
    ],
  };

  const c2: Conversation = {
    id: "c-002",
    supplierName: "Marfrig Global",
    supplierInitials: initials("Marfrig Global"),
    supplierCountryCode: "BR",
    context: { type: "order", id: "0000045", label: "Beef Brisket — Argentina" },
    lastMessagePreview: "Reviewed, looks good. Proceeding with payment.",
    lastMessageAt: ago(24),
    unreadCount: 0,
    isOnline: false,
    messages: [
      mk("c-002", "m1", "system", "System", "Order accepted by supplier", 72),
      mk("c-002", "m2", "supplier", "Marfrig Global",
        "Documents uploaded — please review the BL draft.", 48),
      mk("c-002", "m3", "buyer", BUYER, "Reviewed, looks good. Proceeding with payment.", 24),
    ],
  };

  const c3: Conversation = {
    id: "c-003",
    supplierName: "Pampa Beef",
    supplierInitials: initials("Pampa Beef"),
    supplierCountryCode: "UY",
    context: { type: "offer", id: "0000061", label: "Beef Forequarter — Palestine" },
    lastMessagePreview: "We can offer a 5% discount if you commit by Friday.",
    lastMessageAt: ago(4),
    unreadCount: 1,
    isOnline: true,
    messages: [
      mk("c-003", "m1", "supplier", "Pampa Beef",
        "We can offer a 5% discount if you commit by Friday.", 4, false),
    ],
  };

  const c4: Conversation = {
    id: "c-004",
    supplierName: "Argentina Beef Co",
    supplierInitials: initials("Argentina Beef Co"),
    supplierCountryCode: "AR",
    context: { type: "request", id: "req-0021", label: "Ribeye Q3 Imports — Busan" },
    lastMessagePreview: "Received — we'll send a proposal by tomorrow.",
    lastMessageAt: ago(20),
    unreadCount: 0,
    isOnline: false,
    messages: [
      mk("c-004", "m1", "buyer", BUYER,
        "Hi, we have a new request for Ribeye to Busan, 27 MT, target $6.40/kg.", 26),
      mk("c-004", "m2", "supplier", "Argentina Beef Co",
        "Received — we'll send a proposal by tomorrow.", 20),
    ],
  };

  const c5: Conversation = {
    id: "c-005",
    supplierName: "Tyson Foods Brasil",
    supplierInitials: initials("Tyson Foods Brasil"),
    supplierCountryCode: "BR",
    context: { type: "order", id: "0000038", label: "Chicken Wings — Singapore" },
    lastMessagePreview: "Vessel: MV Pacific Pride, container CXRU1234567.",
    lastMessageAt: ago(48),
    unreadCount: 0,
    isOnline: false,
    messages: [
      mk("c-005", "m1", "system", "System", "Shipment ETD confirmed: June 5", 50),
      mk("c-005", "m2", "supplier", "Tyson Foods Brasil",
        "Vessel: MV Pacific Pride, container CXRU1234567.", 48),
    ],
  };

  const c6: Conversation = {
    id: "c-006",
    supplierName: "WMS Foods",
    supplierInitials: initials("WMS Foods"),
    supplierCountryCode: "BR",
    context: { type: "negotiation", id: "bb-04", label: "Pork Loin Veracruz" },
    lastMessagePreview: "Can also include 200kg of trimmings at no extra cost.",
    lastMessageAt: ago(5),
    unreadCount: 2,
    isOnline: true,
    messages: [
      mk("c-006", "m1", "supplier", "WMS Foods",
        "Round 2 counter: $4.85/kg on the Pork Loin, $5.10/kg on the Tenderloin.", 6, false),
      mk("c-006", "m2", "supplier", "WMS Foods",
        "Can also include 200kg of trimmings at no extra cost as a sample for future orders.", 5, false),
    ],
  };

  const c7: Conversation = {
    id: "c-007",
    supplierName: "Marfrig Global",
    supplierInitials: initials("Marfrig Global"),
    supplierCountryCode: "BR",
    context: { type: "offer", id: "0000045-clone", label: "Beef Hindquarter Topside — Tokyo" },
    lastMessagePreview: "Got it, will discuss internally.",
    lastMessageAt: ago(48),
    unreadCount: 0,
    isOnline: false,
    messages: [
      mk("c-007", "m1", "buyer", BUYER,
        "Interested in your Topside offer, what's the min order?", 72),
      mk("c-007", "m2", "supplier", "Marfrig Global",
        "Minimum is 1 FCL (27 MT). Lead time 35 days from PO.", 72),
      mk("c-007", "m3", "buyer", BUYER, "Got it, will discuss internally.", 48),
    ],
  };

  const c8: Conversation = {
    id: "c-008",
    supplierName: "Pampa Beef",
    supplierInitials: initials("Pampa Beef"),
    supplierCountryCode: "UY",
    context: { type: "request", id: "req-0019", label: "Pork Loin Veracruz" },
    lastMessagePreview: "No worries David, looking forward to the next one.",
    lastMessageAt: ago(14 * 24),
    unreadCount: 0,
    isOnline: false,
    messages: [
      mk("c-008", "m1", "system", "System",
        "This request was closed — winning offer accepted from Tyson Foods Brasil.", 14 * 24),
      mk("c-008", "m2", "supplier", "Pampa Beef",
        "No worries David, looking forward to the next one.", 14 * 24),
    ],
  };

  return [c1, c2, c3, c4, c5, c6, c7, c8];
}

const CONVERSATIONS = build();

export function useBuyerChat() {
  const totalUnread = CONVERSATIONS.reduce((s, c) => s + c.unreadCount, 0);
  return { conversations: CONVERSATIONS, totalUnread };
}

export function useConversation(id: string | undefined) {
  const conversation = id ? CONVERSATIONS.find((c) => c.id === id) ?? null : null;
  return { conversation };
}

export const BUYER_CHAT_TOTAL_UNREAD = CONVERSATIONS.reduce(
  (s, c) => s + c.unreadCount,
  0
);