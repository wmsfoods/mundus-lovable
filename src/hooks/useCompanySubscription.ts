import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";

export type SubscriptionPlan = "supplier_pro" | "buyer_pro";
export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "past_due"
  | "canceled"
  | "trialing"
  | "incomplete";

export type CompanySubscription = {
  id: string;
  company_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
};

type State = {
  isPro: boolean;
  subscription: CompanySubscription | null;
  loading: boolean;
  refresh: () => void;
};

/**
 * Returns the company's PRO subscription status. Walks to the family root
 * so office members inherit the HQ subscription.
 */
export function useCompanySubscription(): State {
  const { company, loading: companyLoading } = useCurrentCompany();
  const [subscription, setSubscription] = useState<CompanySubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const companyId = company?.id ?? null;

  useEffect(() => {
    if (companyLoading) return;
    if (!companyId) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      // Resolve family root via RPC, then read the row directly
      const { data: rootData } = await supabase.rpc("company_family_root", {
        p_company_id: companyId,
      });
      const rootId = (rootData as string) || companyId;
      const { data } = await supabase
        .from("company_subscriptions")
        .select(
          "id, company_id, plan, status, current_period_end, cancel_at_period_end, stripe_customer_id",
        )
        .eq("company_id", rootId)
        .maybeSingle();
      if (cancelled) return;
      setSubscription((data as CompanySubscription | null) ?? null);
      setLoading(false);
    })();

    // Realtime updates so post-checkout status flips immediately
    const channel = supabase
      .channel(`company_subscriptions:${companyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "company_subscriptions" },
        () => setTick((t) => t + 1),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [companyId, companyLoading, tick]);

  return {
    isPro: subscription?.status === "active",
    subscription,
    loading: companyLoading || loading,
    refresh: () => setTick((t) => t + 1),
  };
}