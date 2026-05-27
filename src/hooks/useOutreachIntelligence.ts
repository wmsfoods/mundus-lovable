import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MatchedRecipient {
  companyId: string;
  companyName: string;
  country: string;
  contactEmail: string;
  contactName: string;
  matchScore: number;
  matchReasons: string[];
}

export interface OutreachOpportunity {
  id: string;
  type:
    | "new_offer_to_buyers"
    | "new_request_to_suppliers"
    | "stale_negotiation"
    | "welcome_sequence";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  entityId: string;
  entityType: string;
  entityLabel: string;
  matchedRecipients: MatchedRecipient[];
  suggestedAction: string;
  createdAt: string;
}

export interface OutreachIntelligence {
  opportunities: OutreachOpportunity[];
  stats: {
    totalOpportunities: number;
    highPriority: number;
    totalMatchedRecipients: number;
    totalSent: number;
    activeOffers: number;
    activeRequests: number;
    staleNegotiations: number;
    newSignups: number;
  };
  buyerCount: number;
  supplierCount: number;
}

const DAY = 86_400_000;

export function useOutreachIntelligence() {
  return useQuery<OutreachIntelligence>({
    queryKey: ["outreach-intelligence"],
    staleTime: 120_000,
    queryFn: async () => {
      const [
        offersRes,
        itemsRes,
        marketsRes,
        companiesRes,
        requestsRes,
        negsRes,
        contactsRes,
      ] = await Promise.all([
        supabase
          .from("offers")
          .select("id, offer_number, status, supplier_id, container_size, total_fcl, created_at")
          .eq("status", "active")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("offer_items")
          .select("offer_id, category, cut_name, price_per_kg, quantity_kg"),
        supabase.from("offer_markets").select("offer_id, country_name"),
        supabase
          .from("companies")
          .select("id, name, country, is_supplier, is_buyer, buyer_protein_profile, created_at")
          .is("deleted_at", null),
        supabase
          .from("buyer_requests")
          .select(
            "id, request_number, buyer_company_id, category, destination_country, product_name, status, created_at"
          )
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("negotiations")
          .select("id, offer_id, buyer_company_id, status, updated_at, created_at")
          .is("deleted_at", null),
        supabase
          .from("company_users")
          .select("company_id, email, full_name")
          .not("email", "is", null),
      ]);

      const offers = offersRes.data ?? [];
      const items = itemsRes.data ?? [];
      const markets = marketsRes.data ?? [];
      const companies = companiesRes.data ?? [];
      const requests = requestsRes.data ?? [];
      const negs = negsRes.data ?? [];
      const contacts = contactsRes.data ?? [];

      const buyers = companies.filter((c) => c.is_buyer);
      const suppliers = companies.filter((c) => c.is_supplier);

      const contactFor = (companyId: string | null | undefined) =>
        contacts.find((c) => c.company_id === companyId) || null;

      const now = Date.now();
      const opps: OutreachOpportunity[] = [];

      // 1) New offers → matched buyers
      const recentOffers = offers.filter(
        (o) => now - new Date(o.created_at).getTime() < 7 * DAY
      );

      for (const offer of recentOffers.slice(0, 10)) {
        const offerMarkets = markets
          .filter((m) => m.offer_id === offer.id)
          .map((m) => (m.country_name ?? "").toLowerCase());
        const offerItems = items.filter((i) => i.offer_id === offer.id);
        const offerCategories = [
          ...new Set(offerItems.map((i) => (i.category ?? "").toLowerCase()).filter(Boolean)),
        ];
        const existingNegBuyers = new Set(
          negs.filter((n) => n.offer_id === offer.id).map((n) => n.buyer_company_id)
        );

        const matched: MatchedRecipient[] = [];
        for (const buyer of buyers) {
          if (existingNegBuyers.has(buyer.id)) continue;
          let score = 0;
          const reasons: string[] = [];

          const buyerProteins =
            ((buyer.buyer_protein_profile as string[] | null) ?? []).map((p) =>
              (p ?? "").toLowerCase()
            );
          if (buyerProteins.some((p) => offerCategories.includes(p))) {
            score += 40;
            reasons.push("protein_match");
          }
          if (buyer.country && offerMarkets.includes(buyer.country.toLowerCase())) {
            score += 35;
            reasons.push("destination_match");
          }
          const past = negs.some((n) => {
            const negOffer = offers.find((o) => o.id === n.offer_id);
            return negOffer?.supplier_id === offer.supplier_id && n.buyer_company_id === buyer.id;
          });
          if (past) {
            score += 25;
            reasons.push("past_relationship");
          }

          if (score >= 40) {
            const ct = contactFor(buyer.id);
            matched.push({
              companyId: buyer.id,
              companyName: buyer.name ?? "Unknown",
              country: buyer.country ?? "",
              contactEmail: ct?.email ?? "",
              contactName: ct?.full_name ?? "",
              matchScore: score,
              matchReasons: reasons,
            });
          }
        }

        if (matched.length > 0) {
          const supplierCo = companies.find((c) => c.id === offer.supplier_id);
          const cutPreview = offerItems
            .map((i) => i.cut_name)
            .filter(Boolean)
            .slice(0, 2)
            .join(", ");
          opps.push({
            id: `offer:${offer.id}`,
            type: "new_offer_to_buyers",
            priority: matched.length >= 5 ? "high" : "medium",
            title: `Offer M-${offer.offer_number} → ${matched.length} matched buyers`,
            description: `${supplierCo?.name ?? "Supplier"} published ${cutPreview || "new offer"}${
              offerItems.length > 2 ? ` +${offerItems.length - 2} more` : ""
            }`,
            entityId: offer.id,
            entityType: "offer",
            entityLabel: `M-${offer.offer_number}`,
            matchedRecipients: matched.sort((a, b) => b.matchScore - a.matchScore),
            suggestedAction: "Send offer alert email",
            createdAt: offer.created_at,
          });
        }
      }

      // 2) New requests → matched suppliers
      const recentRequests = requests.filter(
        (r) => now - new Date(r.created_at).getTime() < 7 * DAY && r.status === "new"
      );

      for (const req of recentRequests.slice(0, 10)) {
        const reqCategory = (req.category ?? "").toLowerCase();
        const reqDest = (req.destination_country ?? "").toLowerCase();
        const matched: MatchedRecipient[] = [];

        for (const supplier of suppliers) {
          let score = 0;
          const reasons: string[] = [];
          const supplierOffers = offers.filter((o) => o.supplier_id === supplier.id);
          const supplierCategories = [
            ...new Set(
              items
                .filter((i) => supplierOffers.some((o) => o.id === i.offer_id))
                .map((i) => (i.category ?? "").toLowerCase())
                .filter(Boolean)
            ),
          ];
          if (reqCategory && supplierCategories.includes(reqCategory)) {
            score += 50;
            reasons.push("category_match");
          }
          const supplierMarkets = [
            ...new Set(
              markets
                .filter((m) => supplierOffers.some((o) => o.id === m.offer_id))
                .map((m) => (m.country_name ?? "").toLowerCase())
                .filter(Boolean)
            ),
          ];
          if (reqDest && supplierMarkets.includes(reqDest)) {
            score += 30;
            reasons.push("market_match");
          }
          if (score >= 50) {
            const ct = contactFor(supplier.id);
            matched.push({
              companyId: supplier.id,
              companyName: supplier.name ?? "Unknown",
              country: supplier.country ?? "",
              contactEmail: ct?.email ?? "",
              contactName: ct?.full_name ?? "",
              matchScore: score,
              matchReasons: reasons,
            });
          }
        }

        if (matched.length > 0) {
          const buyerCo = companies.find((c) => c.id === req.buyer_company_id);
          opps.push({
            id: `request:${req.id}`,
            type: "new_request_to_suppliers",
            priority: "high",
            title: `Request R-${req.request_number} → ${matched.length} suppliers`,
            description: `${buyerCo?.name ?? "Buyer"} looking for ${req.product_name} to ${
              req.destination_country ?? "—"
            }`,
            entityId: req.id,
            entityType: "buyer_request",
            entityLabel: `R-${req.request_number}`,
            matchedRecipients: matched.sort((a, b) => b.matchScore - a.matchScore),
            suggestedAction: "Notify matching suppliers",
            createdAt: req.created_at,
          });
        }
      }

      // 3) Stale negotiations
      const closedStatuses = new Set([
        "bid_accepted",
        "bid_rejected",
        "expired",
        "offer_withdrawn",
        "cancelled",
      ]);
      for (const neg of negs) {
        if (closedStatuses.has(neg.status ?? "")) continue;
        const hours = (now - new Date(neg.updated_at).getTime()) / 3_600_000;
        if (hours < 48) continue;
        const buyerCo = companies.find((c) => c.id === neg.buyer_company_id);
        const offer = offers.find((o) => o.id === neg.offer_id);
        const supplierCo = offer ? companies.find((c) => c.id === offer.supplier_id) : null;
        const awaitsBuyer = (neg.status ?? "").includes("buyer");
        const targetCo = awaitsBuyer ? buyerCo : supplierCo;
        const ct = contactFor(targetCo?.id);
        opps.push({
          id: `neg:${neg.id}`,
          type: "stale_negotiation",
          priority: hours >= 96 ? "high" : "medium",
          title: `Stale: ${buyerCo?.name ?? "Buyer"} ↔ ${supplierCo?.name ?? "Supplier"}`,
          description: `No activity for ${Math.round(hours)}h — status: ${neg.status}`,
          entityId: neg.id,
          entityType: "negotiation",
          entityLabel: offer?.offer_number ? `M-${offer.offer_number}` : neg.id.slice(0, 8),
          matchedRecipients: ct && targetCo
            ? [
                {
                  companyId: targetCo.id,
                  companyName: targetCo.name ?? "",
                  country: targetCo.country ?? "",
                  contactEmail: ct.email ?? "",
                  contactName: ct.full_name ?? "",
                  matchScore: 100,
                  matchReasons: ["needs_nudge"],
                },
              ]
            : [],
          suggestedAction: awaitsBuyer ? "Nudge buyer to respond" : "Nudge supplier to counter",
          createdAt: neg.updated_at,
        });
      }

      // 4) Welcome sequence (new signups)
      const newCompanies = companies.filter(
        (c) => now - new Date(c.created_at).getTime() < 7 * DAY
      );
      for (const co of newCompanies.slice(0, 8)) {
        const ct = contactFor(co.id);
        if (!ct) continue;
        const daysAgo = Math.max(1, Math.round((now - new Date(co.created_at).getTime()) / DAY));
        opps.push({
          id: `welcome:${co.id}`,
          type: "welcome_sequence",
          priority: "low",
          title: `Welcome: ${co.name}`,
          description: `New ${co.is_supplier ? "supplier" : "buyer"} from ${
            co.country ?? "—"
          } joined ${daysAgo}d ago`,
          entityId: co.id,
          entityType: "company",
          entityLabel: co.name ?? "",
          matchedRecipients: [
            {
              companyId: co.id,
              companyName: co.name ?? "",
              country: co.country ?? "",
              contactEmail: ct.email ?? "",
              contactName: ct.full_name ?? "",
              matchScore: 100,
              matchReasons: ["new_signup"],
            },
          ],
          suggestedAction: "Send onboarding sequence",
          createdAt: co.created_at,
        });
      }

      // Stats: read sent count from audit_log (best-effort)
      let totalSent = 0;
      try {
        const { count } = await supabase
          .from("audit_log")
          .select("id", { count: "exact", head: true })
          .in("action", ["outreach.sent", "outreach.campaign_created"]);
        totalSent = count ?? 0;
      } catch {
        /* noop */
      }

      const prio = { high: 0, medium: 1, low: 2 } as const;
      opps.sort((a, b) => prio[a.priority] - prio[b.priority]);

      return {
        opportunities: opps,
        stats: {
          totalOpportunities: opps.length,
          highPriority: opps.filter((o) => o.priority === "high").length,
          totalMatchedRecipients: opps.reduce((s, o) => s + o.matchedRecipients.length, 0),
          totalSent,
          activeOffers: offers.length,
          activeRequests: recentRequests.length,
          staleNegotiations: opps.filter((o) => o.type === "stale_negotiation").length,
          newSignups: newCompanies.length,
        },
        buyerCount: buyers.length,
        supplierCount: suppliers.length,
      };
    },
  });
}