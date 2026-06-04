import { supabase } from "@/integrations/supabase/client";
import type { RealNegotiationRow } from "@/hooks/useRealNegotiation";

type CounterProposalRow = {
  id: string;
  cut_round_id: string;
  price_per_kg: number | string;
  rule: string | null;
  is_final: boolean | null;
};

export async function hydrateNegotiationCounterProposals<T extends RealNegotiationRow>(rows: T[]): Promise<T[]> {
  const cutIds = rows.flatMap((neg) =>
    (neg.rounds ?? [])
      .filter((round) => round.round % 2 === 0)
      .flatMap((round) => (round.cut_rounds ?? []).map((cut) => cut.id)),
  );

  if (cutIds.length === 0) return rows;

  const { data, error } = await (supabase as any)
    .from("counter_proposals")
    .select("id, cut_round_id, price_per_kg, rule, is_final")
    .in("cut_round_id", Array.from(new Set(cutIds)));

  if (error || !data?.length) return rows;

  const byCutId = new Map<string, CounterProposalRow>();
  for (const proposal of data as CounterProposalRow[]) byCutId.set(proposal.cut_round_id, proposal);

  return rows.map((neg) => ({
    ...neg,
    rounds: (neg.rounds ?? []).map((round) => {
      if (round.round % 2 === 1) return round;
      return {
        ...round,
        cut_rounds: (round.cut_rounds ?? []).map((cut) => {
          const raw = cut.counter_proposals as unknown;
          const existing = Array.isArray(raw) ? raw[0] : raw;
          if ((existing as { price_per_kg?: unknown } | null)?.price_per_kg != null) return cut;

          const proposal = byCutId.get(cut.id);
          if (!proposal) return cut;

          return {
            ...cut,
            counter_proposals: {
              id: proposal.id,
              price_per_kg: Number(proposal.price_per_kg),
              rule: proposal.rule,
              is_final: proposal.is_final,
            },
          };
        }),
      };
    }),
  }));
}