import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MOCK_SUPPLIER_COMPANY_ID } from "@/hooks/useSupplierUsers";

export type OutreachOffer = {
  id: string;
  offerNumber: number;
  createdAt: string | null;
  title: string;
  origin: string;
  markets: string[];
  incoterm: string;
  pricePerKg: number | null;
  totalFcl: number;
  matchedContacts: number;
  emailsSent: number;
};

export type OutreachContact = {
  id: string;
  fullName: string;
  email: string;
  company: string | null;
  country: string;
  alreadySent: boolean;
};

export type OutreachEmail = {
  id: string;
  offerId: string;
  offerTitle: string;
  contactName: string | null;
  contactEmail: string;
  country: string | null;
  status: string;
  sentAt: string | null;
  createdAt: string;
};

export type OutreachStats = {
  sent7d: number;
  openRate: number;
  pendingOffers: number;
  contactsReached: number;
};

function buildTitle(items: { name: string }[], offerNumber: number, createdAt: string | null) {
  if (!items.length) {
    const y = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
    return `M-${String(offerNumber ?? 0).padStart(6, "0")}-${y}`;
  }
  if (items.length === 1) return items[0].name;
  return `Mixed Container — ${items.length} cuts`;
}

export function useSupplierOutreach() {
  const [offers, setOffers] = useState<OutreachOffer[]>([]);
  const [recentEmails, setRecentEmails] = useState<OutreachEmail[]>([]);
  const [stats, setStats] = useState<OutreachStats>({ sent7d: 0, openRate: 0, pendingOffers: 0, contactsReached: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const supa = supabase as any;

    // 1. Active offers + items + markets
    const { data: rawOffers } = await supa
      .from("offers")
      .select(`
        id, offer_number, created_at, status, origin_country, container_size, total_fcl,
        offer_items(amount, price, customer_products(name)),
        offer_markets(markets(countries(english_name))),
        offer_allowed_incoterms(incoterm)
      `)
      .eq("supplier_id", MOCK_SUPPLIER_COMPANY_ID)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    const offerList: any[] = rawOffers || [];
    const offerIds = offerList.map((o) => o.id);

    // 2. All outreach rows for these offers
    const { data: sentRows } = await supa
      .from("outreach_emails")
      .select("id, offer_id, contact_email, contact_name, country, status, sent_at, created_at, opened_at")
      .in("offer_id", offerIds.length ? offerIds : ["00000000-0000-0000-0000-000000000000"])
      .order("created_at", { ascending: false });
    const sent: any[] = sentRows || [];

    // 3. Contacts (CRM)
    const { data: contacts } = await supa
      .from("crm_contacts")
      .select("id, country, email")
      .not("email", "is", null);
    const contactsByCountry = new Map<string, number>();
    (contacts || []).forEach((c: any) => {
      if (!c.country) return;
      contactsByCountry.set(c.country, (contactsByCountry.get(c.country) || 0) + 1);
    });

    const mappedOffers: OutreachOffer[] = offerList.map((o: any) => {
      const items = (o.offer_items || []).map((it: any) => ({
        name: it.customer_products?.name || "Cut",
        amount: it.amount || 0,
        price: it.price || 0,
      }));
      const markets: string[] = Array.from(
        new Set(
          (o.offer_markets || [])
            .map((m: any) => m.markets?.countries?.english_name)
            .filter(Boolean),
        ),
      );
      const matched = markets.reduce((sum, m) => sum + (contactsByCountry.get(m) || 0), 0);
      const incoterms: string[] = (o.offer_allowed_incoterms || []).map((i: any) => i.incoterm);
      const totalKg = items.reduce((s: number, it: any) => s + (it.amount || 0), 0);
      const valSum = items.reduce((s: number, it: any) => s + (it.amount || 0) * (it.price || 0), 0);
      return {
        id: o.id,
        offerNumber: o.offer_number,
        createdAt: o.created_at ?? null,
        title: buildTitle(items, o.offer_number, o.created_at ?? null),
        origin: o.origin_country || "Brazil",
        markets,
        incoterm: incoterms[0] || "—",
        pricePerKg: totalKg ? valSum / totalKg : null,
        totalFcl: o.total_fcl || 0,
        matchedContacts: matched,
        emailsSent: sent.filter((s) => s.offer_id === o.id).length,
      };
    });

    // Recent emails (last 20)
    const offerTitleMap = new Map(mappedOffers.map((o) => [o.id, o.title]));
    const recent: OutreachEmail[] = sent.slice(0, 20).map((s) => ({
      id: s.id,
      offerId: s.offer_id,
      offerTitle: offerTitleMap.get(s.offer_id) || `Offer ${s.offer_id.slice(0, 6)}`,
      contactName: s.contact_name,
      contactEmail: s.contact_email,
      country: s.country,
      status: s.status,
      sentAt: s.sent_at,
      createdAt: s.created_at,
    }));

    // Stats
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const last7d = sent.filter((s) => new Date(s.created_at).getTime() >= sevenDaysAgo);
    const sentCount = last7d.filter((s) => s.status === "sent" || s.status === "opened" || s.status === "clicked").length;
    const openedCount = last7d.filter((s) => s.status === "opened" || s.status === "clicked" || s.opened_at).length;
    const reached = new Set(sent.map((s) => s.contact_email.toLowerCase())).size;
    const pendingOffers = mappedOffers.filter((o) => o.matchedContacts > o.emailsSent).length;

    setOffers(mappedOffers);
    setRecentEmails(recent);
    setStats({
      sent7d: sentCount,
      openRate: sentCount ? Math.round((openedCount / sentCount) * 100) : 0,
      pendingOffers,
      contactsReached: reached,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { offers, recentEmails, stats, loading, refetch: load };
}

export async function fetchMatchingContacts(
  offerId: string,
  markets: string[],
): Promise<OutreachContact[]> {
  const supa = supabase as any;
  if (markets.length === 0) return [];
  const [{ data: contacts }, { data: sent }] = await Promise.all([
    supa
      .from("crm_contacts")
      .select("id, full_name, email, country, crm_companies(name)")
      .in("country", markets)
      .not("email", "is", null)
      .order("full_name"),
    supa.from("outreach_emails").select("contact_email").eq("offer_id", offerId),
  ]);
  const sentSet = new Set((sent || []).map((s: any) => s.contact_email.toLowerCase()));
  return (contacts || []).map((c: any) => ({
    id: c.id,
    fullName: c.full_name || c.email,
    email: c.email,
    company: c.crm_companies?.name || null,
    country: c.country,
    alreadySent: sentSet.has(c.email.toLowerCase()),
  }));
}