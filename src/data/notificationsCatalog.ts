/**
 * Notifications catalog — single source of truth.
 * Used by the Admin Docs "Notifications" page, by the offline PDF/HTML
 * generator at scripts/generate-notifications-catalog.mjs, and as a
 * reference for design/copy reviews.
 *
 * Bilingual: every user-facing string has PT + EN.
 */

export type NotificationChannel = "email" | "in_app" | "push";

export type NotificationCategory =
  | "auth"
  | "negotiations"
  | "offers"
  | "requests"
  | "orders"
  | "shipping"
  | "team"
  | "billing"
  | "system"
  | "marketing"
  | "internal";

export type Bilingual = { pt: string; en: string };

export interface NotificationEntry {
  /** Stable internal id (kebab-case). */
  id: string;
  /** Display name for the catalog. */
  name: Bilingual;
  /** Functional category (used for filtering and groups). */
  category: NotificationCategory;
  /** What user action / system event triggers it. */
  trigger: Bilingual;
  /** Who receives it (role + how resolved). */
  recipients: Bilingual;
  /** Channels actually used today. */
  channels: NotificationChannel[];
  /** Source files / functions where it is dispatched. */
  sources: string[];
  /** Email template id from src/lib/emailTemplates.ts (when channels includes "email"). */
  emailTemplate?: string;
  /** Subject template (en) when channels includes "email". */
  emailSubject?: string;
  /** Bell / push title + body (en/pt). */
  inApp?: {
    title: Bilingual;
    body: Bilingual;
    icon?: string;
    linkPattern?: string;
  };
  /** Push payload when used (usually mirrors in-app). */
  push?: {
    title: Bilingual;
    body: Bilingual;
  };
  /** Notes / known gaps. */
  notes?: Bilingual;
}

export const NOTIFICATIONS: NotificationEntry[] = [
  // ────────────────────────────── AUTH / ACCOUNT ──────────────────────────────
  {
    id: "signup-welcome",
    name: { pt: "Boas-vindas após signup", en: "Welcome after signup" },
    category: "auth",
    trigger: {
      pt: "Usuário cria a conta e é aprovado.",
      en: "User creates account and is approved.",
    },
    recipients: {
      pt: "O próprio usuário cadastrado.",
      en: "The newly registered user.",
    },
    channels: ["email", "in_app"],
    sources: [
      "supabase/functions/signup-notifications/index.ts",
      "src/lib/emailTemplates.ts → welcome",
    ],
    emailTemplate: "welcome",
    emailSubject: "Welcome to Mundus Trade, {name}! 🎉",
    inApp: {
      title: { pt: "Conta aprovada", en: "Account approved" },
      body: {
        pt: "Sua conta Mundus Trade está pronta. Faça login para começar.",
        en: "Your Mundus Trade account is ready. Sign in to get started.",
      },
      icon: "check",
      linkPattern: "/",
    },
    notes: {
      pt: "Push NÃO disparado neste evento (usuário ainda não tem token).",
      en: "Push NOT fired on this event (user has no device token yet).",
    },
  },
  {
    id: "password-reset",
    name: { pt: "Reset de senha", en: "Password reset" },
    category: "auth",
    trigger: {
      pt: "Usuário pede recuperação de senha na tela de login.",
      en: "User requests password recovery from sign-in screen.",
    },
    recipients: { pt: "O usuário solicitante.", en: "The requesting user." },
    channels: ["email"],
    sources: [
      "supabase/functions/send-password-reset/index.ts",
      "src/lib/emailTemplates.ts → passwordReset",
    ],
    emailTemplate: "passwordReset",
    emailSubject: "Reset your Mundus Trade password",
    notes: {
      pt: "Sem sino e sem push — comunicação só por email, link expira em 24h.",
      en: "No bell or push — email only, link expires in 24h.",
    },
  },
  {
    id: "team-invite",
    name: { pt: "Convite para o time", en: "Team invitation" },
    category: "team",
    trigger: {
      pt: "Admin convida um novo membro para a empresa.",
      en: "Admin invites a new member to the company.",
    },
    recipients: { pt: "Email convidado.", en: "Invited email address." },
    channels: ["email"],
    sources: ["supabase/functions/send-team-invite/index.ts"],
    emailTemplate: "customerInvitation",
    emailSubject: "{inviterCompany} has invited you to Mundus Trade",
  },

  // ────────────────────────────── OFFERS / MARKETPLACE ──────────────────────────────
  {
    id: "offer-new-public",
    name: { pt: "Nova oferta pública", en: "New public offer" },
    category: "offers",
    trigger: {
      pt: "Supplier publica uma oferta visível ao marketplace.",
      en: "Supplier publishes an offer visible to the marketplace.",
    },
    recipients: {
      pt: "Buyers cujas preferências dão match (ainda em rollout).",
      en: "Buyers whose preferences match (still rolling out).",
    },
    channels: ["email"],
    sources: ["src/lib/emailTemplates.ts → newOffer"],
    emailTemplate: "newOffer",
    emailSubject: "New Offer: {cutName} from {origin} — M-{offerNumber}",
    notes: {
      pt: "Hoje o template existe mas o dispatcher automático em massa ainda não foi ativado.",
      en: "Template exists but the automated bulk dispatcher is not active yet.",
    },
  },
  {
    id: "offer-shared-by-link",
    name: { pt: "Oferta compartilhada por link", en: "Offer shared via link" },
    category: "offers",
    trigger: {
      pt: "Supplier compartilha um link da oferta com um contato externo.",
      en: "Supplier shares an offer link with an external contact.",
    },
    recipients: {
      pt: "Email do destinatário escolhido pelo supplier.",
      en: "Email of the recipient chosen by the supplier.",
    },
    channels: ["email"],
    sources: ["src/lib/emailTemplates.ts → offerShared"],
    emailTemplate: "offerShared",
    emailSubject: "{senderName} shared an offer with you",
  },
  {
    id: "offer-deactivated",
    name: { pt: "Oferta desativada (em negociação)", en: "Offer deactivated (was in negotiation)" },
    category: "offers",
    trigger: {
      pt: "Supplier desativa uma oferta que já tem negociação ativa.",
      en: "Supplier deactivates an offer that already has active negotiations.",
    },
    recipients: {
      pt: "Buyers que estavam negociando essa oferta.",
      en: "Buyers who were negotiating that offer.",
    },
    channels: ["in_app", "push"],
    sources: ["src/pages/supplier/OfferDetail.tsx"],
    inApp: {
      title: { pt: "Oferta desativada", en: "Offer deactivated" },
      body: {
        pt: 'A oferta "{offerTitle}" que você estava negociando foi desativada pelo supplier.',
        en: 'The offer "{offerTitle}" you were negotiating was deactivated by the supplier.',
      },
      icon: "alert",
      linkPattern: "/buyer/negotiations/{negotiationId}",
    },
    push: {
      title: { pt: "Oferta desativada", en: "Offer deactivated" },
      body: {
        pt: "Uma oferta que você estava negociando foi desativada.",
        en: "An offer you were negotiating was deactivated.",
      },
    },
    notes: {
      pt: "Não envia email — gap identificado.",
      en: "No email sent — identified gap.",
    },
  },

  // ────────────────────────────── REQUESTS ──────────────────────────────
  {
    id: "request-new-supplier-side",
    name: { pt: "Nova request para o supplier", en: "New request for supplier" },
    category: "requests",
    trigger: {
      pt: "Buyer publica uma request compatível com o catálogo do supplier.",
      en: "Buyer publishes a request that matches the supplier's catalog.",
    },
    recipients: {
      pt: "Suppliers candidatos (matching).",
      en: "Matching candidate suppliers.",
    },
    channels: ["email"],
    sources: ["src/lib/emailTemplates.ts → newRequest"],
    emailTemplate: "newRequest",
    emailSubject: "New Request: {productName} to {destination} — R-{requestNumber}",
  },
  {
    id: "request-offer-response",
    name: { pt: "Supplier respondeu à sua request", en: "Supplier responded to your request" },
    category: "requests",
    trigger: {
      pt: "Supplier publica uma oferta vinculada a uma request específica.",
      en: "Supplier publishes an offer tied to a specific request.",
    },
    recipients: {
      pt: "Todos os usuários ativos da empresa compradora.",
      en: "All active users of the buyer company.",
    },
    channels: ["in_app", "push"],
    sources: ["src/lib/offerSubmit.ts"],
    inApp: {
      title: {
        pt: "Supplier respondeu à sua request",
        en: "Supplier responded to your request",
      },
      body: {
        pt: "{supplierName} enviou uma oferta para {productName}.",
        en: "{supplierName} submitted an offer for {productName}.",
      },
      icon: "package",
      linkPattern: "/buyer/requests/{requestId}",
    },
    notes: {
      pt: "Não dispara email para o buyer — gap.",
      en: "No email to buyer — gap.",
    },
  },

  // ────────────────────────────── NEGOTIATIONS ──────────────────────────────
  {
    id: "bid-received-initial",
    name: { pt: "Bid inicial recebido", en: "Initial bid received" },
    category: "negotiations",
    trigger: {
      pt: "Buyer envia o primeiro bid em uma oferta.",
      en: "Buyer places the first bid on an offer.",
    },
    recipients: {
      pt: "Contato primário do supplier dono da oferta.",
      en: "Primary contact of the supplier that owns the offer.",
    },
    channels: ["email", "in_app", "push"],
    sources: [
      "src/components/buyer/BidModal.tsx",
      "src/lib/emailTemplates.ts → bidReceived",
    ],
    emailTemplate: "bidReceived",
    emailSubject: "New Bid on M-{offerNumber}: {cutName} — US$ {totalValue}",
    inApp: {
      title: { pt: "Novo bid recebido", en: "New bid received" },
      body: {
        pt: "{buyerCompany} fez um bid de US$ {totalValue} em M-{offerNumber}.",
        en: "{buyerCompany} placed a US$ {totalValue} bid on M-{offerNumber}.",
      },
      icon: "dollar",
      linkPattern: "/supplier/negotiations/{negotiationId}",
    },
    push: {
      title: { pt: "Novo bid recebido", en: "New bid received" },
      body: { pt: "{buyerCompany} fez um bid.", en: "{buyerCompany} placed a bid." },
    },
  },
  {
    id: "bid-counter-from-buyer",
    name: { pt: "Contra-bid do buyer", en: "Counter-bid from buyer" },
    category: "negotiations",
    trigger: {
      pt: "Buyer responde a um counter do supplier com um novo bid.",
      en: "Buyer responds to a supplier counter with a new bid.",
    },
    recipients: { pt: "Contato do supplier.", en: "Supplier contact." },
    channels: ["email", "in_app", "push"],
    sources: ["src/components/supplier/CounterOfferModal.tsx"],
    emailTemplate: "bidReceived",
    emailSubject: "New Bid on M-{offerNumber}: {cutName} — US$ {totalValue}",
  },
  {
    id: "counter-received",
    name: { pt: "Counter recebido", en: "Counter offer received" },
    category: "negotiations",
    trigger: {
      pt: "Supplier propõe um counter ao bid do buyer.",
      en: "Supplier proposes a counter to the buyer's bid.",
    },
    recipients: { pt: "Contato do buyer.", en: "Buyer contact." },
    channels: ["email", "in_app", "push"],
    sources: [
      "src/components/supplier/CounterOfferModal.tsx",
      "src/lib/emailTemplates.ts → counterReceived",
    ],
    emailTemplate: "counterReceived",
    emailSubject: "Counter Offer on M-{offerNumber}: {cutName} — Round {round}",
    inApp: {
      title: { pt: "Counter recebido", en: "Counter received" },
      body: {
        pt: "{supplierCompany} respondeu com US$ {counterPrice}/kg.",
        en: "{supplierCompany} replied with US$ {counterPrice}/kg.",
      },
      icon: "chat",
      linkPattern: "/buyer/negotiations/{negotiationId}",
    },
  },
  {
    id: "deal-awaiting-confirmation",
    name: { pt: "Deal aguardando confirmação", en: "Deal awaiting confirmation" },
    category: "negotiations",
    trigger: {
      pt: "Uma das partes aceita todos os itens — a outra precisa confirmar para fechar.",
      en: "One side accepts all items — the other must confirm to close.",
    },
    recipients: {
      pt: "Contraparte (quem ainda precisa confirmar).",
      en: "The counterparty (who still needs to confirm).",
    },
    channels: ["email", "in_app", "push"],
    sources: [
      "src/lib/closeDeal.ts",
      "src/components/supplier/CounterOfferActions.ts",
      "src/components/supplier/CounterOfferModal.tsx",
    ],
    emailTemplate: "dealAwaitingConfirmation",
    emailSubject: "⏳ Action required: confirm M-{offerNumber} (US$ {totalValue})",
    inApp: {
      title: {
        pt: "Confirme o deal",
        en: "Confirm the deal",
      },
      body: {
        pt: "A outra parte aceitou M-{offerNumber}. Revise e confirme para fechar.",
        en: "The other party accepted M-{offerNumber}. Review and confirm to close.",
      },
      icon: "alert",
      linkPattern: "/negotiations/{negotiationId}",
    },
  },
  {
    id: "deal-closed",
    name: { pt: "Deal fechado 🎉", en: "Deal closed 🎉" },
    category: "negotiations",
    trigger: {
      pt: "Ambas as partes confirmaram — negociação vira pedido.",
      en: "Both parties confirmed — negotiation becomes an order.",
    },
    recipients: {
      pt: "Contato do supplier e do buyer (um email cada).",
      en: "Supplier and buyer contacts (one email each).",
    },
    channels: ["email", "in_app", "push"],
    sources: [
      "src/components/supplier/CounterOfferActions.ts",
      "src/lib/emailTemplates.ts → dealClosed",
    ],
    emailTemplate: "dealClosed",
    emailSubject: "🎉 Deal Closed! M-{offerNumber} — US$ {totalValue}",
    inApp: {
      title: { pt: "Deal fechado", en: "Deal closed" },
      body: {
        pt: "M-{offerNumber} foi fechado por US$ {totalValue}.",
        en: "M-{offerNumber} closed at US$ {totalValue}.",
      },
      icon: "check",
      linkPattern: "/orders/{orderId}",
    },
  },
  {
    id: "negotiation-rejected",
    name: { pt: "Negociação rejeitada", en: "Negotiation rejected" },
    category: "negotiations",
    trigger: {
      pt: "Uma das partes rejeita a negociação explicitamente.",
      en: "One side explicitly rejects the negotiation.",
    },
    recipients: {
      pt: "Ambas as partes (supplier e buyer).",
      en: "Both parties (supplier and buyer).",
    },
    channels: ["email", "in_app", "push"],
    sources: [
      "src/components/negotiation/RejectNegotiationModal.tsx",
      "src/components/supplier/CounterOfferActions.ts",
      "src/lib/emailTemplates.ts → negotiationRejected",
    ],
    emailTemplate: "negotiationRejected",
    emailSubject: "Negotiation Ended — M-{offerNumber}",
  },
  {
    id: "negotiation-stale-nudge",
    name: { pt: "Nudge de negociação parada", en: "Stale negotiation nudge" },
    category: "negotiations",
    trigger: {
      pt: "Cron job detecta negociação sem atividade há X horas.",
      en: "Cron job detects a negotiation idle for X hours.",
    },
    recipients: {
      pt: "Parte de quem é o turno de responder.",
      en: "Whichever party owes the next move.",
    },
    channels: ["email", "in_app", "push"],
    sources: [
      "supabase/functions/nudge-stale-negotiations/index.ts",
      "src/lib/emailTemplates.ts → staleNudge",
    ],
    emailTemplate: "staleNudge",
    emailSubject: "⏰ Negotiation waiting — M-{offerNumber}",
    inApp: {
      title: {
        pt: "Negociação aguardando — M-{offerNumber}",
        en: "Negotiation waiting — M-{offerNumber}",
      },
      body: {
        pt: "Sem atividade há {hours}h. Por favor revise.",
        en: "No activity for {hours}h. Please review.",
      },
      icon: "alert",
      linkPattern: "/negotiations/{negotiationId}",
    },
  },
  {
    id: "message-via-mundus",
    name: { pt: "Mensagem via Mundus", en: "Message via Mundus" },
    category: "negotiations",
    trigger: {
      pt: "Usuário envia uma mensagem formal pela Mundus à contraparte.",
      en: "User sends a formal Mundus-relayed message to the counterparty.",
    },
    recipients: { pt: "Contraparte (com cópia ao remetente).", en: "Counterparty (sender bcc'd)." },
    channels: ["email"],
    sources: [
      "supabase/functions/send-via-mundus/index.ts",
      "src/lib/emailTemplates.ts → buildViaMundusEmail",
    ],
    emailTemplate: "buildViaMundusEmail",
    emailSubject: "{subject} (urgent marker if applicable)",
  },

  // ────────────────────────────── ORDERS / SHIPPING ──────────────────────────────
  {
    id: "order-status-update",
    name: { pt: "Atualização de status do pedido", en: "Order status update" },
    category: "orders",
    trigger: {
      pt: "Status do pedido muda (Confirmed → Payment → Shipping → Delivered).",
      en: "Order status transitions across the lifecycle.",
    },
    recipients: { pt: "Buyer e supplier.", en: "Buyer and supplier." },
    channels: ["email"],
    sources: ["src/lib/emailTemplates.ts → orderStatusUpdate"],
    emailTemplate: "orderStatusUpdate",
    emailSubject: "Order Update: M-{offerNumber} — {statusLabel}",
    notes: {
      pt: "Template pronto; ainda não há dispatcher automático em todos os status — gap parcial.",
      en: "Template ready; not yet auto-dispatched on every status — partial gap.",
    },
  },
  {
    id: "shipping-instructions-required",
    name: { pt: "Shipping instructions necessárias", en: "Shipping instructions required" },
    category: "shipping",
    trigger: {
      pt: "Pedido fechado precisa que o buyer informe logística.",
      en: "Closed order needs buyer-provided logistics details.",
    },
    recipients: { pt: "Usuário responsável pela ordem (buyer).", en: "Buyer user responsible for the order." },
    channels: ["email", "in_app", "push"],
    sources: ["supabase/functions/shipping-instructions-send-link/index.ts"],
    emailTemplate: "(custom inline)",
    emailSubject: "Shipping instructions required for order {orderNumber}",
    inApp: {
      title: {
        pt: "Shipping instructions necessárias",
        en: "Shipping instructions required",
      },
      body: {
        pt: "Envie os detalhes logísticos do pedido {orderNumber}.",
        en: "Please submit logistics details for order {orderNumber}.",
      },
      icon: "truck",
      linkPattern: "/orders/{orderId}",
    },
  },
  {
    id: "shipping-instructions-approved",
    name: { pt: "Shipping instructions aprovadas", en: "Shipping instructions approved" },
    category: "shipping",
    trigger: {
      pt: "Time Mundus revisa e aprova as instruções enviadas pelo buyer.",
      en: "Mundus team reviews and approves buyer-submitted instructions.",
    },
    recipients: { pt: "Buyer e supplier.", en: "Buyer and supplier." },
    channels: ["email", "in_app", "push"],
    sources: [
      "supabase/functions/shipping-instructions-notify-approved/index.ts",
    ],
    emailTemplate: "(custom inline)",
    emailSubject: "Shipping instructions approved — {orderNumber}",
    inApp: {
      title: {
        pt: "Instruções de embarque aprovadas",
        en: "Shipping instructions approved",
      },
      body: {
        pt: "As instruções do pedido {orderNumber} foram aprovadas.",
        en: "Instructions for order {orderNumber} were approved.",
      },
      icon: "truck",
      linkPattern: "/orders/{orderId}",
    },
  },

  // ────────────────────────────── SUPPLIER ↔ CUSTOMER LINK ──────────────────────────────
  {
    id: "scl-invite-existing",
    name: { pt: "Convite a buyer já cadastrado", en: "Invite to existing buyer" },
    category: "team",
    trigger: {
      pt: "Supplier convida um buyer que já tem conta para virar cliente.",
      en: "Supplier invites an already-registered buyer to become a customer.",
    },
    recipients: { pt: "Buyer convidado.", en: "Invited buyer." },
    channels: ["email"],
    sources: ["src/hooks/useInviteBuyer.ts"],
    emailTemplate: "scl_invite_existing",
    emailSubject: "You've been invited by {supplier} on Mundus Trade",
  },
  {
    id: "scl-invite-signup",
    name: { pt: "Convite a buyer novo (signup)", en: "Invite to brand-new buyer (signup)" },
    category: "team",
    trigger: {
      pt: "Supplier convida um email que ainda não tem conta.",
      en: "Supplier invites an email that has no account yet.",
    },
    recipients: { pt: "Email convidado.", en: "Invited email address." },
    channels: ["email"],
    sources: ["src/hooks/useInviteBuyer.ts"],
    emailTemplate: "scl_invite_signup",
    emailSubject: "You've been invited to join Mundus Trade by {supplier}",
  },
  {
    id: "scl-direct-offer",
    name: { pt: "Oferta direta para cliente vinculado", en: "Direct offer to linked customer" },
    category: "offers",
    trigger: {
      pt: "Supplier publica uma oferta direcionada a um cliente específico.",
      en: "Supplier publishes an offer targeted at a specific customer.",
    },
    recipients: { pt: "Buyer destinatário.", en: "Targeted buyer." },
    channels: ["email"],
    sources: ["src/lib/emailTemplates.ts → scl_direct_offer"],
    emailTemplate: "scl_direct_offer",
    emailSubject: "Direct offer from {supplier}: {offerTitle}",
  },
  {
    id: "scl-all-customers-offer",
    name: { pt: "Oferta para toda a base de clientes", en: "Offer to all linked customers" },
    category: "offers",
    trigger: {
      pt: "Supplier publica uma oferta para todos os seus clientes vinculados.",
      en: "Supplier publishes an offer to all linked customers.",
    },
    recipients: { pt: "Todos os buyers conectados.", en: "All connected buyers." },
    channels: ["email"],
    sources: ["src/lib/emailTemplates.ts → scl_all_customers_offer"],
    emailTemplate: "scl_all_customers_offer",
    emailSubject: "New offer from {supplier}: {offerTitle}",
  },

  // ────────────────────────────── DIGEST / MARKETING ──────────────────────────────
  {
    id: "weekly-digest",
    name: { pt: "Digest semanal", en: "Weekly digest" },
    category: "marketing",
    trigger: {
      pt: "Cron semanal (segunda-feira de manhã).",
      en: "Weekly cron (Monday morning).",
    },
    recipients: { pt: "Todos os usuários opt-in.", en: "All opted-in users." },
    channels: ["email"],
    sources: ["src/lib/emailTemplates.ts → weeklyDigest"],
    emailTemplate: "weeklyDigest",
    emailSubject: "Your Mundus Trade Weekly Digest — {dateRange}",
    notes: {
      pt: "Template existe; dispatcher cron ainda não foi ligado.",
      en: "Template ready; cron dispatcher not enabled yet.",
    },
  },

  // ────────────────────────────── INTERNAL / ADMIN ──────────────────────────────
  {
    id: "public-lead-captured",
    name: { pt: "Novo lead (home pública)", en: "New public-home lead" },
    category: "internal",
    trigger: {
      pt: "Visitante preenche formulário na home pública mundustrade.us.",
      en: "Visitor submits form on public mundustrade.us home.",
    },
    recipients: {
      pt: "Time interno Mundus (rep designado).",
      en: "Internal Mundus team (assigned rep).",
    },
    channels: ["email"],
    sources: [
      "supabase/functions/public-lead-notify/index.ts",
      "src/lib/emailTemplates.ts → publicLeadCaptured",
    ],
    emailTemplate: "publicLeadCaptured",
    emailSubject: "New public-home lead — {email}",
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Sample variables — used to render previews in the catalog and the PDF.
// Keep numbers realistic so the previews look like real emails.
// ────────────────────────────────────────────────────────────────────────────
export const SAMPLE_VARS: Record<string, Record<string, unknown>> = {
  welcome: {
    name: "Maria Souza",
    company: "Souza Foods",
    email: "maria@souzafoods.com",
    role: "Buyer",
    country: "Brazil",
    countryFlag: "🇧🇷",
  },
  passwordReset: {
    name: "Maria Souza",
    resetUrl: "https://app.mundustrade.us/reset?token=sample-token-xyz",
  },
  newOffer: {
    buyerName: "Maria Souza",
    cutName: "Beef Chuck Roll",
    offerNumber: "001245",
    origin: "Brazil",
    originFlag: "🇧🇷",
    destination: "USA",
    destFlag: "🇺🇸",
    quantity: "27,000",
    fcls: "2",
    containerSize: "27t FCL",
    incoterm: "CFR",
    shipment: "Feb 2026",
    priceFrom: "4.85",
    supplierCompany: "JBS Brazil",
  },
  newRequest: {
    supplierName: "Carlos Lima",
    productName: "Pork Belly",
    requestNumber: "00342",
    buyerCompany: "Asia Foods HK",
    destination: "Hong Kong",
    destFlag: "🇭🇰",
    quantity: "54,000",
    containerSize: "27t FCL",
    incoterm: "CFR",
    targetPrice: "3.20",
    shipment: "Mar 2026",
  },
  bidReceived: {
    supplierName: "Carlos Lima",
    buyerCompany: "Souza Foods",
    buyerCountry: "Brazil",
    buyerFlag: "🇧🇷",
    offerNumber: "001245",
    cutName: "Beef Chuck Roll",
    round: 1,
    maxRounds: 3,
    askingPrice: "4.85",
    bidPrice: "4.55",
    gap: "0.30",
    gapPct: "-6.2",
    totalValue: "122,850",
    destination: "USA",
    destFlag: "🇺🇸",
    cuts: [
      { name: "Chuck Roll", qty: "13,500 kg", askingPerKg: "4.85", bidPerKg: "4.55", movementPct: "-6.2" },
      { name: "Shoulder Clod", qty: "13,500 kg", askingPerKg: "4.20", bidPerKg: "4.00", movementPct: "-4.7" },
    ],
  },
  counterReceived: {
    buyerName: "Maria Souza",
    supplierCompany: "JBS Brazil",
    offerNumber: "001245",
    cutName: "Beef Chuck Roll",
    round: 2,
    maxRounds: 3,
    askingPrice: "4.85",
    yourBid: "4.55",
    counterPrice: "4.70",
    gap: "0.15",
    gapPct: "-3.1",
    totalValue: "126,900",
    isLastRound: false,
    cuts: [
      { name: "Chuck Roll", qty: "13,500 kg", askingPerKg: "4.85", yourBidPerKg: "4.55", counterPerKg: "4.70", movementPct: "+3.3" },
    ],
  },
  dealClosed: {
    name: "Maria Souza",
    cutName: "Beef Chuck Roll",
    offerNumber: "001245",
    quantity: "27,000",
    rounds: 3,
    askingPrice: "4.85",
    finalPrice: "4.70",
    movementPct: "-3.1",
    totalValue: "126,900",
    incoterm: "CFR",
    origin: "Brazil",
    originFlag: "🇧🇷",
    destination: "USA",
    destFlag: "🇺🇸",
    shipment: "Feb 2026",
    supplierCompany: "JBS Brazil",
    buyerCompany: "Souza Foods",
    advancePct: "30",
    advanceAmount: "38,070",
    cuts: [
      { name: "Chuck Roll", qty: "13,500 kg", askingPerKg: "4.85", finalPerKg: "4.70", movementPct: "-3.1" },
      { name: "Shoulder Clod", qty: "13,500 kg", askingPerKg: "4.20", finalPerKg: "4.05", movementPct: "-3.6" },
    ],
  },
  dealAwaitingConfirmation: {
    name: "Maria Souza",
    cutName: "Beef Chuck Roll",
    offerNumber: "001245",
    totalValue: "126,900",
    acceptedBy: "supplier",
    counterpartyCompany: "JBS Brazil",
    negotiationUrl: "https://app.mundustrade.us/buyer/negotiations/abc123",
  },
  negotiationRejected: {
    name: "Maria Souza",
    cutName: "Beef Chuck Roll",
    offerNumber: "001245",
    lastBid: "4.55",
    lastCounter: "4.85",
    gap: "0.30",
    gapPct: "6.2",
    rounds: 3,
    reason: "Final price below our floor.",
  },
  orderStatusUpdate: {
    name: "Maria Souza",
    offerNumber: "001245",
    cutName: "Beef Chuck Roll",
    quantity: "27,000",
    totalValue: "126,900",
    statusLabel: "Payment received",
    statusMessage: "We confirmed your advance payment. Production will begin shortly.",
    statusStep: 1,
  },
  staleNudge: {
    name: "Maria Souza",
    cutName: "Beef Chuck Roll",
    offerNumber: "001245",
    round: 2,
    maxRounds: 3,
    waitingFor: "response",
    hours: 36,
    gap: "0.15",
    gapPct: "-3.1",
    expiryDate: "Feb 12, 2026",
  },
  offerShared: {
    senderName: "Carlos Lima",
    senderCompany: "JBS Brazil",
    cutName: "Beef Chuck Roll",
    origin: "Brazil",
    originFlag: "🇧🇷",
    quantity: "27,000",
    priceFrom: "4.85",
    incoterm: "CFR",
    shipment: "Feb 2026",
    viewUrl: "https://app.mundustrade.us/offers/sample",
  },
  customerInvitation: {
    recipientName: "Maria Souza",
    inviterCompany: "JBS Brazil",
    inviterName: "Carlos Lima",
    inviterEmail: "carlos@jbs.com",
  },
  weeklyDigest: {
    name: "Maria Souza",
    dateRange: "Feb 3 — Feb 9, 2026",
    activeOffers: 12,
    newBids: 28,
    activeNegos: 7,
    dealsClosed: 3,
    revenue: "412,700",
    marketHighlight:
      "Beef Chuck Roll prices firmed +2.1% week over week on tighter Brazilian supply.",
    topOffers: [
      { cut: "Beef Chuck Roll", price: "4.85", country: "🇧🇷 Brazil" },
      { cut: "Pork Belly", price: "3.20", country: "🇨🇳 China" },
      { cut: "Chicken Leg Quarter", price: "1.45", country: "🇺🇸 USA" },
    ],
  },
  publicLeadCaptured: {
    email: "lead@example.com",
    name: "John Buyer",
    company: "ACME Foods",
    phone: "+1 555 010 2030",
    country: "USA",
    protein: "Beef",
    leadType: "Buyer",
    mundusRep: "Lucas (Mundus)",
    lang: "en",
  },
  scl_invite_existing: { supplier: "JBS Brazil", recipientName: "Maria Souza" },
  scl_invite_signup: { supplier: "JBS Brazil", linkId: "abc123" },
  scl_direct_offer: {
    supplier: "JBS Brazil",
    offerTitle: "Beef Chuck Roll — 2× 27t FCL — Feb 2026",
    offerId: "001245",
  },
  scl_all_customers_offer: {
    supplier: "JBS Brazil",
    offerTitle: "Beef Chuck Roll — 2× 27t FCL — Feb 2026",
    offerId: "001245",
  },
};

export const CHANNEL_LABELS: Record<NotificationChannel, Bilingual> = {
  email: { pt: "Email", en: "Email" },
  in_app: { pt: "Sino (in-app)", en: "Bell (in-app)" },
  push: { pt: "Push mobile", en: "Mobile push" },
};

export const CATEGORY_LABELS: Record<NotificationCategory, Bilingual> = {
  auth: { pt: "Autenticação", en: "Authentication" },
  negotiations: { pt: "Negociações", en: "Negotiations" },
  offers: { pt: "Ofertas", en: "Offers" },
  requests: { pt: "Requests", en: "Requests" },
  orders: { pt: "Pedidos", en: "Orders" },
  shipping: { pt: "Logística", en: "Shipping" },
  team: { pt: "Time / Convites", en: "Team / Invites" },
  billing: { pt: "Cobrança", en: "Billing" },
  system: { pt: "Sistema", en: "System" },
  marketing: { pt: "Marketing / Digest", en: "Marketing / Digest" },
  internal: { pt: "Interno (Mundus)", en: "Internal (Mundus)" },
};