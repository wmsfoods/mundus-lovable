/**
 * Mapa central de tipos de notificação → deeplink.
 *
 * Cada notificação carrega um `entityType` + `entityId`. O destino (`to`) é
 * resolvido aqui, garantindo que um clique sempre abra a tela de detalhe
 * correta (order, bid/negotiation, auction, etc.).
 *
 * Para adicionar um novo tipo de notificação:
 *  1. Inclua a chave em `NotificationType`
 *  2. Mapeie em `NOTIFICATION_ROUTES` para qual entidade ela aponta
 */

export type NotificationAudience = "buyer" | "supplier";

export type NotificationEntityType =
  | "offer"
  | "order"
  | "negotiation"
  | "auction"
  | "request"
  | "sale";

export type NotificationType =
  // Buyer-side
  | "new_offer"           // nova oferta disponível            → /buyer/offers/:id
  | "counter_received"    // contraproposta do supplier         → /buyer/negotiations/:id
  | "negotiation_accepted"// supplier aceitou bid               → /buyer/orders/:id
  | "negotiation_rejected"// supplier rejeitou bid              → /buyer/negotiations/:id
  | "auction_awarded"     // ganhou leilão                      → /buyer/orders/:id
  | "auction_lost"        // perdeu leilão                      → /buyer/offers/:id (origem)
  | "order_status_changed"// mudança de status da order         → /buyer/orders/:id
  | "request_response"    // supplier respondeu a um request    → /buyer/requests/:id
  // Supplier-side
  | "bid_received"        // novo bid em uma offer              → /supplier/negotiations/:id
  | "counter_received_supplier" // buyer contraproposta          → /supplier/negotiations/:id
  | "auction_bid"         // novo bid no leilão                 → /supplier/auctions/:id
  | "auction_closed"      // janela do leilão fechou            → /supplier/auctions/:id
  | "order_confirmed"     // buyer confirmou ordem              → /supplier/sales/:id
  | "sale_status_changed" // mudança de status da sale          → /supplier/sales/:id
  | "request_received";   // novo offer-request                 → /supplier/requests/:id

type RouteBuilder = (audience: NotificationAudience, id: string) => string;

const buyerPath = (segment: string, id: string) => `/buyer/${segment}/${id}`;
const supplierPath = (segment: string, id: string) => `/supplier/${segment}/${id}`;

export const NOTIFICATION_ROUTES: Record<
  NotificationType,
  { entityType: NotificationEntityType; to: RouteBuilder }
> = {
  // Buyer
  new_offer:             { entityType: "offer",       to: (_a, id) => buyerPath("offers", id) },
  counter_received:      { entityType: "negotiation", to: (_a, id) => buyerPath("negotiations", id) },
  negotiation_accepted:  { entityType: "order",       to: (_a, id) => buyerPath("orders", id) },
  negotiation_rejected:  { entityType: "negotiation", to: (_a, id) => buyerPath("negotiations", id) },
  auction_awarded:       { entityType: "order",       to: (_a, id) => buyerPath("orders", id) },
  auction_lost:          { entityType: "offer",       to: (_a, id) => buyerPath("offers", id) },
  order_status_changed:  { entityType: "order",       to: (_a, id) => buyerPath("orders", id) },
  request_response:      { entityType: "request",     to: (_a, id) => buyerPath("requests", id) },
  // Supplier
  bid_received:               { entityType: "negotiation", to: (_a, id) => supplierPath("negotiations", id) },
  counter_received_supplier:  { entityType: "negotiation", to: (_a, id) => supplierPath("negotiations", id) },
  auction_bid:                { entityType: "auction",     to: (_a, id) => supplierPath("auctions", id) },
  auction_closed:             { entityType: "auction",     to: (_a, id) => supplierPath("auctions", id) },
  order_confirmed:            { entityType: "sale",        to: (_a, id) => supplierPath("sales", id) },
  sale_status_changed:        { entityType: "sale",        to: (_a, id) => supplierPath("sales", id) },
  request_received:           { entityType: "request",     to: (_a, id) => supplierPath("requests", id) },
};

export function resolveNotificationRoute(
  type: NotificationType,
  entityId: string | undefined,
  audience: NotificationAudience,
): string | undefined {
  if (!entityId) return undefined;
  const cfg = NOTIFICATION_ROUTES[type];
  if (!cfg) return undefined;
  return cfg.to(audience, entityId);
}