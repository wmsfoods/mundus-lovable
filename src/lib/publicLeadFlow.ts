import { supabase } from "@/integrations/supabase/client";
import type { LeadType } from "./mundusReps";

export type LookupResult = {
  found: boolean;
  has_mundus_account: boolean;
  contact_id?: string | null;
  company_id?: string | null;
};

export async function lookupContact(email: string): Promise<LookupResult> {
  const { data, error } = await (supabase as any).rpc("public_lookup_contact", { p_email: email });
  if (error) throw error;
  return data as LookupResult;
}

export interface CapturePayload {
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  country?: string;
  protein?: string;
  proteins?: string[];
  lead_type?: LeadType;
  mundus_rep?: string;
  lang?: string;
}

export async function captureLead(payload: CapturePayload): Promise<{ contact_id: string; company_id: string }> {
  const enriched = {
    ...payload,
    _ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
  };
  const { data, error } = await (supabase as any).rpc("public_capture_lead", { p_payload: enriched });
  if (error) throw error;
  try {
    await supabase.functions.invoke("public-lead-notify", { body: payload });
  } catch {
    /* ignore — capture already succeeded */
  }
  return data as { contact_id: string; company_id: string };
}