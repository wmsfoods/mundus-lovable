import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RecipientContact {
  firstName: string;
  fullName: string;
  email: string;
  companyName: string;
  companyId: string;
  loading: boolean;
  error: string | null;
}

const EMPTY: RecipientContact = {
  firstName: "",
  fullName: "",
  email: "",
  companyName: "",
  companyId: "",
  loading: false,
  error: null,
};

/**
 * Resolve the "other side" of a negotiation — used by the Message via Mundus
 * composer to show the TO pill and to render the trigger label
 * (`Message {firstName} via Mundus`).
 */
export function useRecipientContact(
  negotiationId: string | null,
  currentSide: "buyer" | "supplier" | null,
): RecipientContact {
  const [state, setState] = useState<RecipientContact>({
    ...EMPTY,
    loading: Boolean(negotiationId && currentSide),
  });

  useEffect(() => {
    let cancelled = false;
    if (!negotiationId || !currentSide) {
      setState({ ...EMPTY });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        const { data: neg, error: negErr } = await supabase
          .from("negotiations")
          .select("id, buyer_company_id, offer_id, offers:offer_id(supplier_id)")
          .eq("id", negotiationId)
          .maybeSingle();
        if (negErr) throw negErr;
        if (!neg) throw new Error("negotiation_not_found");

        const buyerCo = (neg as any).buyer_company_id as string;
        const supplierCo = (neg as any).offers?.supplier_id as string;
        const recipientCompanyId =
          currentSide === "buyer" ? supplierCo : buyerCo;
        if (!recipientCompanyId) throw new Error("recipient_unresolved");

        const [{ data: contactRows, error: cErr }, { data: coRow }] = await Promise.all([
          (supabase as any).rpc("get_company_primary_contact", {
            p_company_id: recipientCompanyId,
          }),
          supabase
            .from("companies")
            .select("name")
            .eq("id", recipientCompanyId)
            .maybeSingle(),
        ]);
        if (cErr) throw cErr;
        const contact = Array.isArray(contactRows) ? contactRows[0] : contactRows;
        const email: string = (contact as any)?.email ?? "";
        const full: string =
          (contact as any)?.full_name ?? (email ? email.split("@")[0] : "");
        const firstName = (full || "there").split(" ")[0];
        const companyName = (coRow as any)?.name ?? "";

        if (cancelled) return;
        setState({
          firstName,
          fullName: full,
          email,
          companyName,
          companyId: recipientCompanyId,
          loading: false,
          error: email ? null : "recipient_unreachable",
        });
      } catch (e: any) {
        if (cancelled) return;
        setState({ ...EMPTY, error: e?.message ?? "unknown" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [negotiationId, currentSide]);

  return state;
}