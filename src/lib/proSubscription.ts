import { supabase } from "@/integrations/supabase/client";

export type ProPlan = "supplier_pro" | "buyer_pro";

export const PRO_PRICE_MONTHLY: Record<ProPlan, number> = {
  supplier_pro: 1000,
  buyer_pro: 300,
};

export function planForFeature(
  feature: "price-benchmark" | "analytics" | "procurement" | "cut-comparison" | "market-intelligence",
  side: "supplier" | "buyer",
): ProPlan {
  if (side === "buyer") return "buyer_pro";
  if (feature === "procurement") return "buyer_pro";
  return "supplier_pro";
}

export async function startProCheckout(opts: {
  company_id: string;
  plan: ProPlan;
  success_url: string;
  cancel_url: string;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke("stripe-create-checkout", {
    body: opts,
  });
  if (error) throw error;
  const url = (data as { url?: string })?.url;
  if (!url) throw new Error("no_url");
  return url;
}

export async function openBillingPortal(opts: {
  company_id: string;
  return_url: string;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke("stripe-create-portal", {
    body: opts,
  });
  if (error) throw error;
  const url = (data as { url?: string })?.url;
  if (!url) throw new Error("no_url");
  return url;
}