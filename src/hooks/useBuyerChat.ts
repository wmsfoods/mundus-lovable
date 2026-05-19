export type ChatMessage = {
  id: string;
  conversationId: string;
  senderName: string;
  senderInitials: string;
  text: string;
  timestamp: string;
  isFromMe: boolean;
  isSystem?: boolean;
  attachmentName?: string;
};

export type LinkedEntityType = "offer" | "negotiation" | "request" | "general";

export type Conversation = {
  id: string;
  counterpartyName: string;
  counterpartyInitials: string;
  counterpartyCountryCode: string;
  linkedToType: LinkedEntityType;
  linkedToId?: string;
  linkedToTitle?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
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

function mk(
  cid: string,
  id: string,
  sender: string,
  text: string,
  hoursAgo: number,
  isFromMe: boolean,
  extra: Partial<ChatMessage> = {}
): ChatMessage {
  return {
    id,
    conversationId: cid,
    senderName: sender,
    senderInitials: initials(sender),
    text,
    timestamp: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
    isFromMe,
    ...extra,
  };
}

const ME = "You";

function build(): Conversation[] {
  const c01: Conversation = {
    id: "c-01",
    counterpartyName: "WMS Foods",
    counterpartyInitials: "WF",
    counterpartyCountryCode: "BR",
    linkedToType: "offer",
    linkedToId: "off-2025-0142",
    linkedToTitle: "Ribeye Premium Cuts",
    lastMessage: "Confirmed shipment for September 5th",
    lastMessageAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    unreadCount: 0,
    messages: [
      mk("c-01", "m1", "WMS Foods", "Hello! Sharing the latest specs for the Ribeye cuts.", 72, false, { attachmentName: "ribeye-specs.pdf" }),
      mk("c-01", "m2", ME, "Thanks, looks great. What's the shipment window?", 70, true),
      mk("c-01", "m3", "System", "Offer #2025-0142 was published", 68, false, { isSystem: true }),
      mk("c-01", "m4", "WMS Foods", "We can dispatch on Sept 5th, ETA Busan around Oct 12.", 50, false),
      mk("c-01", "m5", ME, "Perfect. Please proceed with the booking.", 28, true),
      mk("c-01", "m6", "WMS Foods", "Booking confirmed with Maersk.", 12, false),
      mk("c-01", "m7", ME, "Great, send us the BL draft when ready.", 6, true),
      mk("c-01", "m8", "WMS Foods", "Confirmed shipment for September 5th", 2, false),
    ],
  };

  const c02: Conversation = {
    id: "c-02",
    counterpartyName: "Marfrig Global",
    counterpartyInitials: "MG",
    counterpartyCountryCode: "BR",
    linkedToType: "negotiation",
    linkedToId: "neg-0066",
    linkedToTitle: "Pork Loin — Round 3",
    lastMessage: "Counter at $7.10/kg sent",
    lastMessageAt: new Date(Date.now() - 4 * 3600_000).toISOString(),
    unreadCount: 2,
    messages: [
      mk("c-02", "m1", "Marfrig Global", "Initial offer attached.", 96, false, { attachmentName: "marfrig-offer.pdf" }),
      mk("c-02", "m2", ME, "Reviewing internally, will respond soon.", 94, true),
      mk("c-02", "m3", ME, "Can you improve the lead time?", 80, true),
      mk("c-02", "m4", "Marfrig Global", "We can shorten to 35 days if confirmed this week.", 78, false),
      mk("c-02", "m5", "System", "Round 2 counter sent", 70, false, { isSystem: true }),
      mk("c-02", "m6", ME, "Our counter is $7.00/kg CFR.", 68, true),
      mk("c-02", "m7", "Marfrig Global", "We can meet at $7.20/kg.", 50, false),
      mk("c-02", "m8", ME, "Let's split the difference, $7.10/kg.", 30, true),
      mk("c-02", "m9", "System", "Round 3 awaiting", 28, false, { isSystem: true }),
      mk("c-02", "m10", "Marfrig Global", "We will review and confirm by EOD.", 12, false),
      mk("c-02", "m11", "Marfrig Global", "Working on internal approval.", 6, false),
      mk("c-02", "m12", "Marfrig Global", "Counter at $7.10/kg sent", 4, false),
    ],
  };

  const c03: Conversation = {
    id: "c-03",
    counterpartyName: "Pampa Beef",
    counterpartyInitials: "PB",
    counterpartyCountryCode: "UY",
    linkedToType: "request",
    linkedToId: "req-0019",
    linkedToTitle: "Pork Loin — Mexico",
    lastMessage: "We can deliver in 38 days, confirming",
    lastMessageAt: new Date(Date.now() - 24 * 3600_000).toISOString(),
    unreadCount: 1,
    messages: [
      mk("c-03", "m1", "Pampa Beef", "Good morning, we saw your RFQ for Pork Loin.", 80, false),
      mk("c-03", "m2", ME, "Hi! We need 25,000 kg CFR Veracruz.", 78, true),
      mk("c-03", "m3", "Pampa Beef", "Understood. Volume is fine for us.", 60, false),
      mk("c-03", "m4", ME, "What's the indicative price?", 50, true),
      mk("c-03", "m5", "Pampa Beef", "Around $4.05/kg, lead time 38 days.", 36, false),
      mk("c-03", "m6", "Pampa Beef", "We can deliver in 38 days, confirming", 24, false),
    ],
  };

  const c04: Conversation = {
    id: "c-04",
    counterpartyName: "Tyson Foods Brasil",
    counterpartyInitials: "TF",
    counterpartyCountryCode: "BR",
    linkedToType: "offer",
    linkedToId: "off-2025-0098",
    linkedToTitle: "Chicken Wings Singapore",
    lastMessage: "Shipment arrived at port, customs cleared",
    lastMessageAt: new Date(Date.now() - 72 * 3600_000).toISOString(),
    unreadCount: 0,
    messages: [
      mk("c-04", "m1", "Tyson Foods Brasil", "Order confirmed and in production.", 240, false),
      mk("c-04", "m2", "Tyson Foods Brasil", "Production complete.", 200, false, { attachmentName: "qa-report.pdf" }),
      mk("c-04", "m3", ME, "Thanks for the QA report.", 198, true),
      mk("c-04", "m4", "Tyson Foods Brasil", "Container loaded today.", 180, false),
      mk("c-04", "m5", "Tyson Foods Brasil", "BL draft attached.", 170, false, { attachmentName: "bl-draft.pdf" }),
      mk("c-04", "m6", ME, "Looks good, approved.", 168, true),
      mk("c-04", "m7", "Tyson Foods Brasil", "Vessel departed Santos.", 160, false),
      mk("c-04", "m8", "Tyson Foods Brasil", "ETA Singapore in 18 days.", 158, false),
      mk("c-04", "m9", ME, "Noted, thanks.", 156, true),
      mk("c-04", "m10", "Tyson Foods Brasil", "Vessel arrived at port.", 100, false),
      mk("c-04", "m11", "Tyson Foods Brasil", "Customs documentation submitted.", 96, false),
      mk("c-04", "m12", "Tyson Foods Brasil", "Customs cleared.", 80, false),
      mk("c-04", "m13", ME, "Great, ready for delivery.", 78, true),
      mk("c-04", "m14", "Tyson Foods Brasil", "Shipment arrived at port, customs cleared", 72, false),
    ],
  };

  const c05: Conversation = {
    id: "c-05",
    counterpartyName: "Argentina Beef Co",
    counterpartyInitials: "AB",
    counterpartyCountryCode: "AR",
    linkedToType: "request",
    linkedToId: "req-0017",
    linkedToTitle: "Beef Brisket — Angola",
    lastMessage: "Following up on the offer details",
    lastMessageAt: new Date(Date.now() - 48 * 3600_000).toISOString(),
    unreadCount: 1,
    messages: [
      mk("c-05", "m1", "Argentina Beef Co", "Sending our proposal for Brisket Choice.", 96, false),
      mk("c-05", "m2", ME, "Received, will review with the team.", 80, true),
      mk("c-05", "m3", "Argentina Beef Co", "Any updates on our offer?", 60, false),
      mk("c-05", "m4", "Argentina Beef Co", "Following up on the offer details", 48, false),
    ],
  };

  const c06: Conversation = {
    id: "c-06",
    counterpartyName: "WMS Foods",
    counterpartyInitials: "WF",
    counterpartyCountryCode: "BR",
    linkedToType: "general",
    lastMessage: "Q3 planning call confirmed for Wednesday",
    lastMessageAt: new Date(Date.now() - 24 * 7 * 3600_000).toISOString(),
    unreadCount: 0,
    messages: [
      mk("c-06", "m1", ME, "Hi, can we schedule a Q3 planning call?", 200, true),
      mk("c-06", "m2", "WMS Foods", "Sure, what about next Wednesday?", 196, false),
      mk("c-06", "m3", ME, "Wednesday 3pm BRT works.", 190, true),
      mk("c-06", "m4", "WMS Foods", "Invite sent.", 180, false),
      mk("c-06", "m5", "WMS Foods", "Q3 planning call confirmed for Wednesday", 168, false),
    ],
  };

  return [c01, c02, c03, c04, c05, c06];
}

const CONVERSATIONS = build();

export function useBuyerConversations() {
  const totalUnread = CONVERSATIONS.reduce((s, c) => s + c.unreadCount, 0);
  return { conversations: CONVERSATIONS, totalUnread };
}

export function useBuyerConversation(id?: string) {
  return CONVERSATIONS.find((c) => c.id === id);
}