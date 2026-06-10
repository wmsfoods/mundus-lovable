import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MundusCompany = {
  id: string;
  name: string;
  norm: string;
  status: string | null;
  is_buyer: boolean;
  is_supplier: boolean;
  has_users: boolean;
};

export function normalizeCompanyName(s: string): string {
  return (s ?? "")
    .toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(S\.?A\.?|LTDA|LTD|LLC|INC|CO\.?|S\.?A\.?S|GMBH|BV|NV|SARL|SRL|EIRELI|ME|EPP|CIA|COMPANY|COMPANHIA|GROUP|GRUPO|HOLDING|FRIGORIFICO|FRIGORÍFICO|FOODS|FOOD|TRADING|TRADE|EXPORT|IMPORT|IND|INDUSTRIA|INDÚSTRIA|COMERCIAL|COMERCIO|COMÉRCIO)\b/g, " ")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type MundusStatus = "cliente" | "convidado" | "prospect";

export function matchMundusStatus(candidate: string, list: MundusCompany[]): { status: MundusStatus; matched?: MundusCompany } {
  const cand = normalizeCompanyName(candidate);
  if (!cand || cand.length < 3) return { status: "prospect" };
  const exact = list.find((c) => c.norm === cand);
  const partial = exact ?? list.find((c) => c.norm.length >= 3 && (cand.includes(c.norm) || c.norm.includes(cand)));
  if (!partial) return { status: "prospect" };
  if (partial.has_users && partial.is_buyer) return { status: "cliente", matched: partial };
  return { status: "convidado", matched: partial };
}

export function useMundusCompanies() {
  const [data, setData] = useState<MundusCompany[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancel = false;
    (async () => {
      const [{ data: companies }, { data: users }] = await Promise.all([
        supabase.from("companies").select("id, name, status, is_buyer, is_supplier").limit(5000),
        supabase.from("company_users").select("company_id"),
      ]);
      if (cancel) return;
      const withUsers = new Set((users ?? []).map((u: any) => u.company_id));
      const list: MundusCompany[] = (companies ?? []).map((c: any) => ({
        id: c.id,
        name: c.name ?? "",
        norm: normalizeCompanyName(c.name ?? ""),
        status: c.status ?? null,
        is_buyer: !!c.is_buyer,
        is_supplier: !!c.is_supplier,
        has_users: withUsers.has(c.id),
      }));
      setData(list); setLoading(false);
    })();
    return () => { cancel = true; };
  }, []);
  return { data, loading };
}