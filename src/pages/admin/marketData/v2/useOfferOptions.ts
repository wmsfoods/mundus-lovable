import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const OFFAL_KEYWORDS = [
  "liver","kidney","tongue","heart","tripe","tail","cheek","head","brain","lung","sweetbread",
  "weasand","aorta","abomasum","rumen","omasum","mountain chain","intestine","offal","oxtail",
  "figado","fígado","lingua","língua","coracao","coração","rins","tripa","mocoto","mocotó","rabo",
];

export type OfferOption = {
  id: string;
  offer_number: number;
  supplier_name: string;
  supplier_id: string;
  status: string | null;
  created_at: string | null;
  hsCategories: string[];           // derived: beef / beef_offals / pork / poultry / other_meats
  destCountries: string[];          // english_name list from offer_markets → countries
  cutNames: string[];               // cut/product names sample
  label: string;
};

function deriveCategories(rows: { name: string | null; product_categories: { code: string | null } | null }[]): string[] {
  const cats = new Set<string>();
  let hasOffalKeyword = false;
  for (const r of rows) {
    const code = r.product_categories?.code?.toLowerCase() ?? "";
    if (code === "beef") cats.add("beef");
    else if (code === "pork") cats.add("pork");
    else if (code === "poultry") cats.add("poultry");
    else if (code === "lamb" || code === "ovine") cats.add("other_meats");
    const n = (r.name ?? "").toLowerCase();
    if (n && OFFAL_KEYWORDS.some((k) => n.includes(k))) {
      hasOffalKeyword = true;
    }
  }
  if (hasOffalKeyword && cats.has("beef")) cats.add("beef_offals");
  return Array.from(cats);
}

export function useOfferOptions(limit = 80) {
  const [data, setData] = useState<OfferOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data: offers, error: err } = await supabase
        .from("offers")
        .select(
          `id, offer_number, supplier_id, supplier_name, status, created_at,
           offer_items:offer_items(
             customer_products:customer_products(
               name,
               standard_products:standard_products(
                 product_categories:product_categories(code)
               )
             )
           ),
           offer_markets:offer_markets(
             markets:markets(
               countries:countries(english_name)
             )
           )`
        )
        .is("deleted_at", null)
        .in("status", ["active", "draft", "inactive", "sold_out"])
        .order("created_at", { ascending: false })
        .limit(limit);
      if (cancel) return;
      if (err) { setError(err.message); setLoading(false); return; }
      const mapped: OfferOption[] = (offers ?? []).map((o: any) => {
        const items = (o.offer_items ?? []) as any[];
        const productRows = items.map((it) => ({
          name: it.customer_products?.name ?? null,
          product_categories: it.customer_products?.standard_products?.product_categories ?? null,
        }));
        const cats = deriveCategories(productRows);
        const dests: string[] = Array.from(
          new Set(
            (o.offer_markets ?? [])
              .map((m: any) => m.markets?.countries?.english_name)
              .filter((x: unknown): x is string => typeof x === "string" && x.length > 0),
          ),
        ) as string[];
        const cutNames = productRows.map((p) => p.name).filter((x): x is string => !!x).slice(0, 4);
        return {
          id: o.id,
          offer_number: o.offer_number,
          supplier_id: o.supplier_id,
          supplier_name: o.supplier_name ?? "",
          status: o.status ?? null,
          created_at: o.created_at ?? null,
          hsCategories: cats,
          destCountries: dests,
          cutNames,
          label: `#${o.offer_number} — ${o.supplier_name ?? ""} (${cats.join(", ") || "—"})`,
        };
      });
      setData(mapped); setLoading(false);
    })();
    return () => { cancel = true; };
  }, [limit]);

  return { data, loading, error };
}